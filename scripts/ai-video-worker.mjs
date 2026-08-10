#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { hostname, homedir } from "node:os";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const JOBS_COLLECTION = "adminAiVideoJobs";
const WORKER_DOCUMENT = "adminSystem/aiVideoWorker";
const VIDEO_SIZE = "720x1280";
const MAX_DURATION_SECONDS = 45;
const POLL_INTERVAL_MS = 12_000;
const IDLE_INTERVAL_MS = 4_000;
const LEASE_MS = 90_000;
const TRANSITION_SECONDS = 0.35;
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

let db;
let bucket;
let stopping = false;
let cachedFfmpeg = "";

function env(name) {
  const value = process.env[name]?.trim() ?? "";
  return value.replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function boolEnv(name, fallback = false) {
  const value = env(name).toLowerCase();
  if (!value) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function jsonFromEnvFile(name) {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return null;
  const source = readFileSync(filePath, "utf8");
  const match = source.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match) return null;
  const start = match.index + match[0].indexOf("=") + 1;
  const candidate = source.slice(start).trimStart();
  if (!candidate.startsWith("{")) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < candidate.length; index += 1) {
    const character = candidate[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}" && --depth === 0) return JSON.parse(candidate.slice(0, index + 1));
  }
  return null;
}

function serviceAccount() {
  const inline = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) {
    try { return JSON.parse(inline); }
    catch {
      const multiline = jsonFromEnvFile("FIREBASE_SERVICE_ACCOUNT_JSON");
      if (multiline) return multiline;
    }
  }
  const configuredPath = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!configuredPath) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  const absolute = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  return JSON.parse(readFileSync(absolute, "utf8"));
}

function initializeFirebase() {
  const storageBucket = requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()), storageBucket });
  db = getFirestore();
  bucket = getStorage().bucket(storageBucket);
}

function openAiKey() {
  return env("ONEIRO_OPENAI_API_KEY") || requiredEnv("OPENAI_API_KEY");
}

function workRoot() {
  const configured = env("AI_VIDEO_WORK_DIR");
  return path.resolve(configured || path.join(process.cwd(), ".ai-video-work"));
}

function ffmpegBin() {
  if (cachedFfmpeg) return cachedFfmpeg;
  const configured = env("FFMPEG_BIN") || env("VIDEO_FFMPEG_BIN");
  if (configured) return (cachedFfmpeg = configured);
  const moneyPrinterRoot = env("MONEYPRINTERTURBO_ROOT") || path.join(homedir(), "MoneyPrinterTurbo");
  const binaries = path.join(moneyPrinterRoot, ".venv", "lib", "python3.11", "site-packages", "imageio_ffmpeg", "binaries");
  if (existsSync(binaries)) {
    const binary = readdirSync(binaries).find((name) => name.startsWith("ffmpeg-") && !name.endsWith(".md"));
    if (binary) return (cachedFfmpeg = path.join(binaries, binary));
  }
  return (cachedFfmpeg = "ffmpeg");
}

function ffprobeBin() {
  return env("FFPROBE_BIN") || "ffprobe";
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const secrets = [env("OPENAI_API_KEY"), env("ONEIRO_OPENAI_API_KEY"), env("TELEGRAM_BOT_TOKEN")].filter(Boolean);
  let clean = message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[redacted]");
  for (const secret of secrets) clean = clean.split(secret).join("[redacted]");
  return clean.slice(0, 2_000);
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout = (stdout + chunk.toString()).slice(-200_000); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-20_000); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} exited with ${code}: ${stderr.slice(-4_000)}`));
    });
  });
}

async function requestWithRetries(url, options = {}, responseType = "json") {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs ?? 90_000) });
      if (!response.ok) {
        const body = await response.text();
        const parsed = (() => { try { return JSON.parse(body); } catch { return null; } })();
        const message = parsed?.error?.message || parsed?.message || body.slice(0, 500) || "request failed";
        const error = new Error(`HTTP ${response.status}: ${message}`);
        error.status = response.status;
        if (!RETRYABLE_STATUS.has(response.status)) throw error;
        lastError = error;
      } else if (responseType === "buffer") {
        return Buffer.from(await response.arrayBuffer());
      } else {
        return await response.json();
      }
    } catch (error) {
      if (Number(error?.status) && !RETRYABLE_STATUS.has(Number(error.status))) throw error;
      lastError = error;
    }
    await delay(Math.min(30_000, 1_000 * (2 ** attempt)) + Math.floor(Math.random() * 400));
  }
  throw lastError ?? new Error("Request failed after retries");
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${openAiKey()}`, ...extra };
}

async function heartbeat(state = "idle", currentJobId = "") {
  await db.doc(WORKER_DOCUMENT).set({
    state,
    currentJobId,
    workerId,
    host: hostname(),
    pid: process.pid,
    lastSeenAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  if (currentJobId) {
    await db.collection(JOBS_COLLECTION).doc(currentJobId).set({
      leaseOwner: workerId,
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS),
    }, { merge: true });
  }
}

async function updateJob(reference, values) {
  await reference.update({ ...values, updatedAt: FieldValue.serverTimestamp() });
}

async function claimNextJob() {
  const snapshot = await db.collection(JOBS_COLLECTION).where("status", "in", ["queued", "processing"]).limit(30).get();
  const candidates = [...snapshot.docs].sort((left, right) =>
    (left.get("createdAt")?.toMillis?.() ?? 0) - (right.get("createdAt")?.toMillis?.() ?? 0));
  for (const candidate of candidates) {
    let claimed = null;
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(candidate.ref);
      if (!fresh.exists) return;
      const data = fresh.data();
      const status = data.status;
      const leaseExpires = data.leaseExpiresAt?.toMillis?.() ?? 0;
      if (status !== "queued" && !(status === "processing" && leaseExpires < Date.now())) return;
      transaction.update(candidate.ref, {
        status: "processing",
        stage: data.retryTelegramOnly ? "retrying-telegram" : data.stage === "queued" ? "preparing" : data.stage,
        progress: Number(data.progress ?? 0),
        language: "en-US",
        leaseOwner: workerId,
        leaseExpiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS),
        startedAt: data.startedAt || FieldValue.serverTimestamp(),
        completedAt: null,
        error: "",
      });
      claimed = { id: fresh.id, ...data, status: "processing" };
    });
    if (claimed) return claimed;
  }
  return null;
}

function videoPackageSchema(sceneCount) {
  return {
    name: "oneiro_sora_video_package",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        script: { type: "string" },
        scenePrompts: { type: "array", minItems: sceneCount, maxItems: sceneCount, items: { type: "string" } },
        youtube: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" }, description: { type: "string" },
            tags: { type: "array", minItems: 10, maxItems: 15, items: { type: "string" } },
            hashtags: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
            thumbnailText: { type: "string" }, pinnedComment: { type: "string" }, category: { type: "string" },
          },
          required: ["title", "description", "tags", "hashtags", "thumbnailText", "pinnedComment", "category"],
        },
      },
      required: ["script", "scenePrompts", "youtube"],
    },
  };
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function uniqueStrings(values, maximum) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].slice(0, maximum);
}

function parsePackage(content, sceneCount) {
  const parsed = JSON.parse(String(content ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  const script = String(parsed.script ?? "").trim();
  const scenePrompts = Array.isArray(parsed.scenePrompts) ? parsed.scenePrompts.map((value) => String(value).trim()) : [];
  const youtube = parsed.youtube && typeof parsed.youtube === "object" ? parsed.youtube : {};
  const youtubeMetadata = {
    title: String(youtube.title ?? "").trim(),
    description: String(youtube.description ?? "").trim().slice(0, 5_000),
    tags: uniqueStrings(Array.isArray(youtube.tags) ? youtube.tags : [], 15),
    hashtags: uniqueStrings(Array.isArray(youtube.hashtags) ? youtube.hashtags : [], 5).map((tag) => tag.replace(/^#/, "")),
    thumbnailText: String(youtube.thumbnailText ?? "").trim(),
    pinnedComment: String(youtube.pinnedComment ?? "").trim().slice(0, 1_000),
    category: String(youtube.category ?? "Education").trim().slice(0, 80),
  };
  const errors = [];
  const words = wordCount(script);
  if (words < 65 || words > 75) errors.push(`narration has ${words} words, expected 65–75`);
  if (scenePrompts.length !== sceneCount || scenePrompts.some((prompt) => prompt.length < 80)) errors.push(`expected ${sceneCount} detailed scene prompts`);
  if (!youtubeMetadata.title || youtubeMetadata.title.length > 70) errors.push("YouTube title must be 1–70 characters");
  if (!youtubeMetadata.description) errors.push("description is missing");
  if (youtubeMetadata.tags.length < 10) errors.push("expected 10–15 unique tags");
  if (youtubeMetadata.hashtags.length < 3) errors.push("expected 3–5 unique hashtags");
  const thumbnailWords = wordCount(youtubeMetadata.thumbnailText);
  if (thumbnailWords < 2 || thumbnailWords > 4) errors.push("thumbnail text must have 2–4 words");
  if (!youtubeMetadata.pinnedComment) errors.push("pinned comment is missing");
  if (errors.length) throw new Error(errors.join("; "));
  return { script, scenePrompts, youtubeMetadata };
}

async function generatePackage(job, reference) {
  if (job.script && Array.isArray(job.scenePrompts) && job.scenePrompts.length === job.sceneCount && job.youtubeMetadata) {
    return { script: job.script, scenePrompts: job.scenePrompts, youtubeMetadata: job.youtubeMetadata, tokenUsage: job.tokenUsage };
  }
  const model = env("VIDEO_OPENAI_MODEL") || env("OPENAI_DREAM_MODEL") || "gpt-4o-mini";
  const baseUrl = (env("VIDEO_OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
  const usage = { prompt: 0, completion: 0, total: 0, model };
  let validationError = "Invalid structured response";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const payload = await requestWithRetries(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        model,
        response_format: { type: "json_schema", json_schema: videoPackageSchema(job.sceneCount) },
        messages: [
          {
            role: "system",
            content: `Create an English-only YouTube Short production package. Write a natural 65–75-word voice-over and exactly ${job.sceneCount} independent Sora scene prompts. Every scene prompt must independently specify the subject, location and environment, natural motion, camera movement, lighting, mood, photorealistic detail, and stable geometry. Every prompt must explicitly prohibit dialogue, captions, visible text, logos, watermarks, recognizable public figures, copyrighted characters, and copyrighted music. Do not depict real people. The YouTube title must be accurate and at most 70 characters. Return 10–15 tags, 3–5 hashtags without #, 2–4 words of thumbnail text, a pinned comment, and category. Do not use markdown.`,
          },
          { role: "user", content: `Topic: ${job.topic}\nMode: ${job.mode}.\nAll generated content must be English only.` },
        ],
      }),
      timeoutMs: 120_000,
    });
    const prompt = Number(payload?.usage?.prompt_tokens ?? 0);
    const completion = Number(payload?.usage?.completion_tokens ?? 0);
    usage.prompt += prompt;
    usage.completion += completion;
    usage.total += Number(payload?.usage?.total_tokens ?? prompt + completion);
    usage.model = String(payload?.model ?? model);
    try {
      if (payload?.choices?.[0]?.message?.refusal) throw new Error(String(payload.choices[0].message.refusal));
      const generated = parsePackage(payload?.choices?.[0]?.message?.content, job.sceneCount);
      await updateJob(reference, { ...generated, tokenUsage: usage, stage: "script-ready", progress: 10 });
      return { ...generated, tokenUsage: usage };
    } catch (error) {
      validationError = cleanError(error);
    }
  }
  throw new Error(`${validationError} after 3 script attempts`);
}

async function fileIsUsable(filePath, minimumBytes = 1_024) {
  try { return (await stat(filePath)).size >= minimumBytes; } catch { return false; }
}

async function mediaInfo(filePath) {
  try {
    const result = await runProcess(ffprobeBin(), ["-v", "error", "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height,pix_fmt", "-of", "json", filePath]);
    return JSON.parse(result.stdout);
  } catch {
    const result = await runProcess(ffmpegBin(), ["-hide_banner", "-i", filePath, "-map", "0", "-c", "copy", "-f", "null", "-"]);
    const lines = result.stderr.split(/\r?\n/);
    const durationMatch = result.stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    const duration = durationMatch
      ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
      : 0;
    const streams = [];
    const videoLine = lines.find((line) => line.includes(" Video: "));
    if (videoLine) {
      const codec = videoLine.match(/Video:\s*([^,\s]+)/)?.[1] ?? "";
      const pixFmt = videoLine.match(/,\s*(yuv[a-z0-9]+)(?:\([^)]*\))?(?:,|\s)/)?.[1] ?? "";
      const size = videoLine.match(/(\d{2,5})x(\d{2,5})(?:\s|,)/);
      streams.push({ codec_type: "video", codec_name: codec, pix_fmt: pixFmt, width: Number(size?.[1] ?? 0), height: Number(size?.[2] ?? 0) });
    }
    const audioLine = lines.find((line) => line.includes(" Audio: "));
    if (audioLine) streams.push({ codec_type: "audio", codec_name: audioLine.match(/Audio:\s*([^,\s]+)/)?.[1] ?? "" });
    return { format: { duration }, streams };
  }
}

async function mediaDuration(filePath) {
  const info = await mediaInfo(filePath);
  return Number(info?.format?.duration ?? 0);
}

async function ensureNarration(job, reference, directory, script) {
  const narrationPath = path.join(directory, "narration.mp3");
  if (await fileIsUsable(narrationPath, 4_096)) return narrationPath;
  await updateJob(reference, { stage: "generating-narration", progress: 12 });
  const baseUrl = (env("VIDEO_OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
  const audio = await requestWithRetries(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: env("AI_VIDEO_TTS_MODEL") || "tts-1-hd",
      voice: env("AI_VIDEO_TTS_VOICE") || "nova",
      input: script,
      response_format: "mp3",
    }),
    timeoutMs: 180_000,
  }, "buffer");
  await writeFile(narrationPath, audio, { mode: 0o600 });
  if (!(await fileIsUsable(narrationPath, 4_096))) throw new Error("Narration download was empty");
  return narrationPath;
}

function sceneState(job, index) {
  const found = Array.isArray(job.sceneStates) ? job.sceneStates.find((scene) => scene.index === index) : null;
  return found ?? { index, status: "pending", taskId: null, progress: 0, error: "", safePromptRetryCount: 0 };
}

async function saveSceneState(reference, job, state) {
  const states = Array.from({ length: job.sceneCount }, (_, index) => index === state.index ? state : sceneState(job, index));
  const ids = Array.from({ length: job.sceneCount }, (_, index) => states[index]?.taskId ?? null);
  job.sceneStates = states;
  job.providerTaskIds = ids;
  await updateJob(reference, { sceneStates: states, providerTaskIds: ids });
}

async function resolveTaskIdFromJournal(directory, index) {
  const journal = path.join(directory, `scene-${index + 1}-task-id.txt`);
  try {
    const taskId = (await readFile(journal, "utf8")).trim();
    return /^video_[A-Za-z0-9_-]+$/.test(taskId) ? taskId : "";
  } catch { return ""; }
}

function safeRetryPrompt(prompt, retryCount) {
  if (!retryCount) return prompt;
  return `${prompt}\nSafety revision ${retryCount}: use only fictional, non-human or non-identifiable subjects; avoid faces, brands, copyrighted designs, violence, suggestive content, or hazardous behavior. Keep the core environment and camera concept.`;
}

async function createSoraTask(job, reference, directory, index, prompt, state) {
  const journalTaskId = await resolveTaskIdFromJournal(directory, index);
  if (state.taskId || journalTaskId) {
    state.taskId = state.taskId || journalTaskId;
    state.status = state.status === "completed" ? "completed" : "submitted";
    await saveSceneState(reference, job, state);
    return state.taskId;
  }
  if (!boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED", false)) {
    throw new Error("Paid Sora generation is disabled in this worker");
  }
  const model = env("SORA_VIDEO_MODEL") || "sora-2";
  const seconds = String(job.sceneSeconds);
  const idempotencyKey = `oneiro-${job.id}-scene-${index + 1}-retry-${state.safePromptRetryCount || 0}`;
  const task = await requestWithRetries("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }),
    body: JSON.stringify({ model, prompt: safeRetryPrompt(prompt, state.safePromptRetryCount), size: VIDEO_SIZE, seconds }),
    timeoutMs: 120_000,
  });
  if (!task?.id) throw new Error("Sora create response did not include a task id");
  state.taskId = String(task.id);
  state.status = task.status === "in_progress" ? "rendering" : "submitted";
  state.progress = Number(task.progress ?? 0);
  await writeFile(path.join(directory, `scene-${index + 1}-task-id.txt`), `${state.taskId}\n`, { mode: 0o600 });
  const requestedSeconds = job.sceneStates.reduce((sum, scene) => sum + (scene.taskId ? job.sceneSeconds : 0), 0);
  await saveSceneState(reference, job, state);
  await updateJob(reference, {
    providerUsage: { model, size: VIDEO_SIZE, requestedSeconds, generatedSeconds: Number(job.generatedSeconds ?? 0) },
  });
  return state.taskId;
}

async function pollSoraTask(job, reference, state) {
  const deadline = Date.now() + 90 * 60_000;
  while (!stopping && Date.now() < deadline) {
    const task = await requestWithRetries(`https://api.openai.com/v1/videos/${encodeURIComponent(state.taskId)}`, {
      headers: authHeaders(), timeoutMs: 60_000,
    });
    state.progress = Number(task?.progress ?? state.progress ?? 0);
    state.status = task?.status === "in_progress" ? "rendering" : task?.status === "queued" ? "submitted" : state.status;
    await saveSceneState(reference, job, state);
    if (task?.status === "completed") return task;
    if (task?.status === "failed" || task?.status === "expired") {
      const providerMessage = task?.error?.message || `Sora task ${task.status}`;
      state.status = "failed";
      state.error = cleanError(providerMessage);
      await saveSceneState(reference, job, state);
      await updateJob(reference, { failedSceneIndex: state.index, error: state.error });
      throw new Error(`Scene ${state.index + 1} failed: ${providerMessage}`);
    }
    await heartbeat("processing", job.id);
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`Polling timed out for scene ${state.index + 1}; retry will resume task ${state.taskId}`);
}

async function ensureScene(job, reference, directory, index, prompt) {
  const output = path.join(directory, `scene-${index + 1}.mp4`);
  const state = sceneState(job, index);
  if (await fileIsUsable(output, 20_000)) {
    try {
      const info = await mediaInfo(output);
      if (info.streams?.some((stream) => stream.codec_type === "video")) {
        state.status = "completed";
        state.progress = 100;
        await saveSceneState(reference, job, state);
        return output;
      }
    } catch {}
  }
  await createSoraTask(job, reference, directory, index, prompt, state);
  if (state.status !== "completed") await pollSoraTask(job, reference, state);
  const video = await requestWithRetries(`https://api.openai.com/v1/videos/${encodeURIComponent(state.taskId)}/content`, {
    headers: authHeaders(), timeoutMs: 180_000,
  }, "buffer");
  await writeFile(output, video, { mode: 0o600 });
  if (!(await fileIsUsable(output, 20_000))) throw new Error(`Downloaded scene ${index + 1} is empty`);
  state.status = "completed";
  state.progress = 100;
  state.error = "";
  const generatedSeconds = Array.from({ length: job.sceneCount }, (_, sceneIndex) =>
    sceneIndex === index ? state : sceneState(job, sceneIndex)).filter((scene) => scene.status === "completed").length * job.sceneSeconds;
  job.generatedSeconds = generatedSeconds;
  await saveSceneState(reference, job, state);
  await updateJob(reference, {
    generatedSeconds,
    providerUsage: {
      model: env("SORA_VIDEO_MODEL") || "sora-2",
      size: VIDEO_SIZE,
      requestedSeconds: job.sceneStates.filter((scene) => scene.taskId).length * job.sceneSeconds,
      generatedSeconds,
    },
  });
  return output;
}

function assTime(seconds) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = (safe % 60).toFixed(2).padStart(5, "0");
  return `${hours}:${String(minutes).padStart(2, "0")}:${rest}`;
}

function escapeAss(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}").replace(/\r?\n/g, " ");
}

function subtitleGroups(script) {
  const words = script.trim().split(/\s+/).filter(Boolean);
  const groups = [];
  let group = [];
  for (const word of words) {
    const projected = [...group, word].join(" ");
    if (group.length && (projected.length > 34 || group.length >= 7)) {
      groups.push(group);
      group = [];
    }
    group.push(word);
    if (group.length >= 3 && /[.!?]$/.test(word)) {
      groups.push(group);
      group = [];
    }
  }
  if (group.length) groups.push(group);
  return groups;
}

function wrapSubtitleWords(words) {
  if (words.join(" ").length <= 24 || words.length < 4) return [words];
  let best = 1;
  let difference = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const current = Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length);
    if (current < difference) { difference = current; best = index; }
  }
  return [words.slice(0, best), words.slice(best)];
}

async function writeSubtitleAss(filePath, script, duration) {
  const groups = subtitleGroups(script);
  const totalWords = Math.max(1, groups.reduce((sum, group) => sum + group.length, 0));
  const secondsPerWord = duration / totalWords;
  let cursor = 0;
  const dialogues = groups.map((group) => {
    const start = cursor;
    const end = Math.min(duration, cursor + group.length * secondsPerWord);
    cursor = end;
    const lines = wrapSubtitleWords(group);
    const karaoke = lines.map((line) => line.map((word) => `{\\kf${Math.max(1, Math.round(secondsPerWord * 100))}}${escapeAss(word)}`).join(" ")).join("\\N");
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Karaoke,,0,0,0,,{\\fad(90,110)}${karaoke}`;
  });
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Karaoke,Arial,50,&H00FFFFFF,&H0000D7FF,&H00141424,&H78000000,-1,0,0,0,100,100,0,0,1,4,1,2,64,64,176,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join("\n")}\n`;
  await writeFile(filePath, ass, "utf8");
}

async function writeThumbnailAss(filePath, text, duration) {
  const safe = escapeAss(text.toUpperCase());
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: 720\nPlayResY: 1280\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,Arial,72,&H00FFFFFF,&H00FFFFFF,&H00121220,&HA0000000,-1,0,0,0,100,100,1,0,3,7,0,5,60,60,120,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:00.00,${assTime(duration)},Title,,0,0,0,,${safe}\n`;
  await writeFile(filePath, ass, "utf8");
}

function assFilter(filePath) {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/,/g, "\\,");
}

async function composeVideo(job, clips, narrationPath, script, thumbnailText, directory) {
  const normalized = [];
  for (let index = 0; index < clips.length; index += 1) {
    const output = path.join(directory, `normalized-${index + 1}.mp4`);
    await runProcess(ffmpegBin(), [
      "-y", "-i", clips[index], "-t", String(job.sceneSeconds), "-an",
      "-vf", "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p",
      "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", output,
    ]);
    normalized.push(output);
  }

  const visualPath = path.join(directory, "visuals.mp4");
  if (normalized.length === 1) {
    await runProcess(ffmpegBin(), ["-y", "-i", normalized[0], "-an", "-c:v", "copy", visualPath]);
  } else {
    const args = ["-y"];
    for (const clip of normalized) args.push("-i", clip);
    const filters = [];
    let previous = "[0:v]";
    for (let index = 1; index < normalized.length; index += 1) {
      const output = `[x${index}]`;
      const offset = index * job.sceneSeconds - index * TRANSITION_SECONDS;
      filters.push(`${previous}[${index}:v]xfade=transition=fade:duration=${TRANSITION_SECONDS}:offset=${offset.toFixed(2)}${output}`);
      previous = output;
    }
    args.push("-filter_complex", filters.join(";"), "-map", previous, "-an", "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", visualPath);
    await runProcess(ffmpegBin(), args);
  }

  const visualDuration = normalized.length * job.sceneSeconds - (normalized.length - 1) * TRANSITION_SECONDS;
  const narrationDuration = await mediaDuration(narrationPath);
  const duration = Math.max(0.5, Math.min(MAX_DURATION_SECONDS, visualDuration, narrationDuration + 0.2));
  const subtitles = path.join(directory, "subtitles.ass");
  await writeSubtitleAss(subtitles, script, Math.min(narrationDuration, duration));
  const finalPath = path.join(directory, "final.mp4");
  const fadeOutStart = Math.max(0, duration - 0.55);
  await runProcess(ffmpegBin(), [
    "-y", "-i", visualPath, "-i", narrationPath,
    "-filter_complex", `[0:v]ass='${assFilter(subtitles)}'[v];[1:a]atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.18,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=0.5[a]`,
    "-map", "[v]", "-map", "[a]", "-t", duration.toFixed(3),
    "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", finalPath,
  ]);

  const thumbnailAss = path.join(directory, "thumbnail.ass");
  await writeThumbnailAss(thumbnailAss, thumbnailText, duration);
  const thumbnailPath = path.join(directory, "thumbnail.jpg");
  await runProcess(ffmpegBin(), [
    "-y", "-ss", String(Math.min(1, duration / 3)), "-i", visualPath,
    "-vf", `ass='${assFilter(thumbnailAss)}'`, "-frames:v", "1", "-q:v", "2", thumbnailPath,
  ]);
  return { finalPath, thumbnailPath, subtitles, duration };
}

async function validateFinalVideo(filePath) {
  const info = await mediaInfo(filePath);
  const video = info.streams?.find((stream) => stream.codec_type === "video");
  const audio = info.streams?.find((stream) => stream.codec_type === "audio");
  const duration = Number(info?.format?.duration ?? 0);
  if (!video || video.width !== 720 || video.height !== 1280 || video.pix_fmt !== "yuv420p") {
    throw new Error(`Invalid video stream: expected 720x1280 yuv420p, received ${video?.width}x${video?.height} ${video?.pix_fmt}`);
  }
  if (video.codec_name !== "h264") throw new Error(`Invalid video codec: expected H.264, received ${video.codec_name ?? "none"}`);
  if (!audio || audio.codec_name !== "aac") throw new Error(`Invalid audio stream: expected AAC, received ${audio?.codec_name ?? "none"}`);
  if (!(duration > 0 && duration <= MAX_DURATION_SECONDS + 0.05)) throw new Error(`Invalid duration: ${duration}`);
  await runProcess(ffmpegBin(), ["-v", "error", "-i", filePath, "-map", "0:v:0", "-f", "null", "-"]);
  await runProcess(ffmpegBin(), ["-v", "error", "-i", filePath, "-map", "0:a:0", "-f", "null", "-"]);
  return { duration, video, audio };
}

async function uploadAsset(jobId, filePath, kind) {
  const extension = kind === "video" ? "mp4" : "jpg";
  const destination = `admin-ai-videos/${jobId}/${kind}.${extension}`;
  const token = randomUUID();
  await bucket.upload(filePath, {
    destination,
    resumable: false,
    metadata: {
      contentType: kind === "video" ? "video/mp4" : "image/jpeg",
      cacheControl: "private, max-age=3600",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return {
    path: destination,
    url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`,
  };
}

async function sendTelegram(filePath, caption) {
  const token = requiredEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requiredEnv("TELEGRAM_PERSONAL_CHAT_ID");
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption.slice(0, 1_024));
  form.append("supports_streaming", "true");
  form.append("video", new Blob([await readFile(filePath)], { type: "video/mp4" }), "oneiro-sora-short.mp4");
  const payload = await requestWithRetries(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: "POST", body: form, timeoutMs: 240_000,
  });
  if (!payload?.ok) throw new Error(`Telegram: ${payload?.description ?? "send failed"}`);
  return Number(payload?.result?.message_id ?? 0);
}

async function ensureLocalFinal(job, directory) {
  const finalPath = path.join(directory, "final.mp4");
  if (await fileIsUsable(finalPath, 20_000)) return finalPath;
  if (!job.videoStoragePath) throw new Error("Stored video path is unavailable for Telegram retry");
  await bucket.file(job.videoStoragePath).download({ destination: finalPath });
  return finalPath;
}

async function retryTelegram(job, reference, directory) {
  let telegramMessageId = null;
  let telegramError = "";
  try {
    const finalPath = await ensureLocalFinal(job, directory);
    telegramMessageId = await sendTelegram(finalPath, `${job.topic}\nEnglish · Sora ${job.mode}`);
  } catch (error) {
    telegramError = cleanError(error);
  }
  await updateJob(reference, {
    status: "completed", stage: "completed", progress: 100, retryTelegramOnly: false,
    telegramStatus: telegramMessageId ? "sent" : "failed", telegramMessageId, telegramError,
    completedAt: job.completedAt || FieldValue.serverTimestamp(), error: "", leaseOwner: "", leaseExpiresAt: null,
  });
}

async function processJob(job) {
  const reference = db.collection(JOBS_COLLECTION).doc(job.id);
  const directory = path.join(workRoot(), job.id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const heartbeatTimer = setInterval(() => { void heartbeat("processing", job.id).catch(() => {}); }, 25_000);
  try {
    await heartbeat("processing", job.id);
    if (job.retryTelegramOnly) {
      await retryTelegram(job, reference, directory);
      return;
    }
    if (job.costConfirmed !== true) throw new Error("Job is missing server-validated paid-generation confirmation");
    if (job.budgetReservationStatus !== "reserved") throw new Error("Job is missing a transactional budget reservation");
    if (job.mode !== "preview" && job.mode !== "standard") throw new Error("Invalid job mode");
    if (typeof job.topic !== "string" || job.topic.trim().length < 5 || job.topic.trim().length > 500) throw new Error("Invalid job topic");
    const trustedMode = job.mode === "preview"
      ? { sceneCount: 1, sceneSeconds: 4 }
      : { sceneCount: 4, sceneSeconds: 8 };
    job.sceneCount = trustedMode.sceneCount;
    job.sceneSeconds = trustedMode.sceneSeconds;
    job.language = "en-US";
    const current = (await reference.get()).data();
    job = { ...job, ...current, id: job.id };
    job.sceneCount = trustedMode.sceneCount;
    job.sceneSeconds = trustedMode.sceneSeconds;
    job.language = "en-US";
    await updateJob(reference, { stage: "writing-script", progress: Math.max(2, Number(job.progress ?? 0)) });
    const generated = await generatePackage(job, reference);
    Object.assign(job, generated);
    const narrationPath = await ensureNarration(job, reference, directory, generated.script);
    await updateJob(reference, { stage: "generating-scenes", progress: 18 });
    const clips = [];
    for (let index = 0; index < job.sceneCount; index += 1) {
      const progress = 18 + Math.round((index / job.sceneCount) * 55);
      await updateJob(reference, { stage: `scene-${index + 1}-of-${job.sceneCount}`, progress });
      clips.push(await ensureScene(job, reference, directory, index, generated.scenePrompts[index]));
    }
    await updateJob(reference, { stage: "editing-video", progress: 78 });
    const rendered = await composeVideo(job, clips, narrationPath, generated.script, generated.youtubeMetadata.thumbnailText, directory);
    await updateJob(reference, { stage: "validating-video", progress: 90 });
    await validateFinalVideo(rendered.finalPath);
    await updateJob(reference, { stage: "uploading-private-assets", progress: 93 });
    const [video, thumbnail] = await Promise.all([
      uploadAsset(job.id, rendered.finalPath, "video"),
      uploadAsset(job.id, rendered.thumbnailPath, "thumbnail"),
    ]);
    let telegramMessageId = null;
    let telegramError = "";
    if (job.sendToTelegram !== false) {
      await updateJob(reference, { stage: "sending-telegram", progress: 98, telegramStatus: "sending" });
      try { telegramMessageId = await sendTelegram(rendered.finalPath, `${job.topic}\nEnglish · Sora ${job.mode}`); }
      catch (error) { telegramError = cleanError(error); }
    }
    await updateJob(reference, {
      status: "completed", stage: "completed", progress: 100,
      completedAt: FieldValue.serverTimestamp(), videoUrl: video.url, thumbnailUrl: thumbnail.url,
      videoStoragePath: video.path, thumbnailStoragePath: thumbnail.path,
      telegramMessageId, telegramError,
      telegramStatus: job.sendToTelegram === false ? "disabled" : telegramMessageId ? "sent" : "failed",
      retryTelegramOnly: false, error: "", failedSceneIndex: null, leaseOwner: "", leaseExpiresAt: null,
      finalDurationSeconds: rendered.duration,
    });
  } catch (error) {
    const message = cleanError(error);
    console.error(`[ai-video-worker] job ${job.id} failed: ${message}`);
    await updateJob(reference, {
      status: "failed", stage: "failed", error: message,
      completedAt: FieldValue.serverTimestamp(), leaseOwner: "", leaseExpiresAt: null,
    });
  } finally {
    clearInterval(heartbeatTimer);
    await heartbeat("idle", "");
  }
}

async function runCheck() {
  const checks = {
    openAiKey: Boolean(env("ONEIRO_OPENAI_API_KEY") || env("OPENAI_API_KEY")),
    firebaseCredentials: false,
    storageBucket: Boolean(env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")),
    telegramBotToken: Boolean(env("TELEGRAM_BOT_TOKEN")),
    telegramChatId: Boolean(env("TELEGRAM_PERSONAL_CHAT_ID")),
    ffmpeg: false,
    ffprobe: false,
    mediaProbe: false,
  };
  try { const account = serviceAccount(); checks.firebaseCredentials = Boolean(account?.project_id && account?.private_key && account?.client_email); } catch {}
  try { await runProcess(ffmpegBin(), ["-version"]); checks.ffmpeg = true; } catch {}
  try { await runProcess(ffprobeBin(), ["-version"]); checks.ffprobe = true; } catch {}
  checks.mediaProbe = checks.ffprobe || checks.ffmpeg;
  const required = ["openAiKey", "firebaseCredentials", "storageBucket", "ffmpeg", "mediaProbe"];
  const ok = required.every((key) => checks[key]);
  console.log(JSON.stringify({
    ok,
    readOnly: true,
    checks,
    paidGenerationEnabled: boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED", false),
    soraModel: env("SORA_VIDEO_MODEL") || "sora-2",
    pricePerSecondUsd: Number(env("SORA_PRICE_PER_SECOND_USD") || 0.1),
    dailyBudgetUsd: Number(env("AI_VIDEO_DAILY_BUDGET_USD") || 5),
    maxJobsPerDay: Number(env("AI_VIDEO_MAX_JOBS_PER_DAY") || 2),
    videoSize: VIDEO_SIZE,
    maxDurationSeconds: MAX_DURATION_SECONDS,
  }, null, 2));
  if (!ok) process.exitCode = 1;
}

async function runSyntheticTest() {
  const directory = path.join(workRoot(), "synthetic-validation");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const colors = ["#20104a", "#0d5c63", "#7a3219", "#23451f"];
  const clips = [];
  for (let index = 0; index < colors.length; index += 1) {
    const output = path.join(directory, `synthetic-scene-${index + 1}.mp4`);
    await runProcess(ffmpegBin(), [
      "-y", "-f", "lavfi", "-i", `color=c=${colors[index]}:s=720x1280:r=30:d=2`,
      "-vf", `drawbox=x=70:y=${160 + index * 80}:w=580:h=260:color=white@0.12:t=fill`,
      "-an", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", output,
    ]);
    clips.push(output);
  }
  const narration = path.join(directory, "synthetic-narration.wav");
  await runProcess(ffmpegBin(), ["-y", "-f", "lavfi", "-i", "sine=frequency=330:sample_rate=48000:duration=8", "-c:a", "pcm_s16le", narration]);
  const script = "Every vivid dream begins as a quiet signal, then gathers color, motion, emotion, and meaning. Notice the place, the people, and the feeling that stayed after waking. Small details often reveal the strongest pattern. Write them down before the morning fades, compare them with your waking life, and let curiosity guide the interpretation instead of fear or certainty.";
  const rendered = await composeVideo({ id: "synthetic", sceneSeconds: 2 }, clips, narration, script, "READ YOUR DREAMS", directory);
  const validation = await validateFinalVideo(rendered.finalPath);
  console.log(JSON.stringify({ ok: true, paidGenerationPerformed: false, output: rendered.finalPath, thumbnail: rendered.thumbnailPath, subtitles: rendered.subtitles, validation }, null, 2));
}

async function main() {
  if (process.argv.includes("--check")) return runCheck();
  if (process.argv.includes("--synthetic-test")) return runSyntheticTest();
  initializeFirebase();
  await mkdir(workRoot(), { recursive: true, mode: 0o700 });
  console.log(`[ai-video-worker] ready on ${hostname()} · Sora · English only · paid calls ${boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED") ? "enabled" : "disabled"}`);
  await heartbeat();
  while (!stopping) {
    const job = await claimNextJob();
    if (job) {
      console.log(`[ai-video-worker] processing job ${job.id}`);
      await processJob(job);
    } else {
      await heartbeat();
      await delay(IDLE_INTERVAL_MS);
    }
  }
  await heartbeat("offline", "");
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

main().catch((error) => {
  console.error(`[ai-video-worker] fatal: ${cleanError(error)}`);
  process.exitCode = 1;
});
