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
const BATCH_POLL_INTERVAL_MS = 60_000;
const IDLE_INTERVAL_MS = 4_000;
const LEASE_MS = 90_000;
const TRANSITION_SECONDS = 0.35;
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

let db;
let bucket;
let googleCredential;
let firebaseServiceAccount;
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
  if (firebaseServiceAccount) return firebaseServiceAccount;
  const inline = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) {
    try { return (firebaseServiceAccount = JSON.parse(inline)); }
    catch {
      const multiline = jsonFromEnvFile("FIREBASE_SERVICE_ACCOUNT_JSON");
      if (multiline) return (firebaseServiceAccount = multiline);
    }
  }
  const configuredPath = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!configuredPath) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  const absolute = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  return (firebaseServiceAccount = JSON.parse(readFileSync(absolute, "utf8")));
}

function initializeFirebase() {
  const storageBucket = requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  googleCredential = cert(serviceAccount());
  if (!getApps().length) initializeApp({ credential: googleCredential, storageBucket });
  db = getFirestore();
  bucket = getStorage().bucket(storageBucket);
}

function openAiKey() {
  return env("ONEIRO_OPENAI_API_KEY") || requiredEnv("OPENAI_API_KEY");
}

function pexelsApiKey() {
  const configured = env("PEXELS_API_KEY") || env("VIDEO_PEXELS_API_KEY");
  if (configured) return configured;
  const moneyPrinterRoot = env("MONEYPRINTERTURBO_ROOT") || path.join(homedir(), "MoneyPrinterTurbo");
  const configPath = path.join(moneyPrinterRoot, "config.toml");
  if (existsSync(configPath)) {
    const match = readFileSync(configPath, "utf8").match(/^pexels_api_keys\s*=\s*\[\s*["']([^"']+)["']/m);
    if (match?.[1]) return match[1].trim();
  }
  throw new Error("Combined mode needs PEXELS_API_KEY or a configured MoneyPrinterTurbo Pexels key");
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
  const secrets = [env("OPENAI_API_KEY"), env("ONEIRO_OPENAI_API_KEY"), env("TELEGRAM_BOT_TOKEN"), env("PEXELS_API_KEY"), env("VIDEO_PEXELS_API_KEY")].filter(Boolean);
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

function veoConfig() {
  const account = serviceAccount();
  return {
    projectId: env("VEO_PROJECT_ID") || env("GOOGLE_CLOUD_PROJECT") || String(account.project_id || ""),
    location: env("VEO_LOCATION") || "us-central1",
    model: env("VEO_VIDEO_MODEL") || "veo-3.1-lite-generate-001",
  };
}

async function vertexHeaders(extra = {}) {
  if (!googleCredential) googleCredential = cert(serviceAccount());
  const token = await googleCredential.getAccessToken();
  if (!token?.access_token) throw new Error("Unable to obtain a Google Cloud access token for Vertex AI");
  return { Authorization: `Bearer ${token.access_token}`, ...extra };
}

function veoEndpoint(action) {
  const { projectId, location, model } = veoConfig();
  if (!projectId) throw new Error("Veo needs VEO_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or project_id in the service account");
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:${action}`;
}

async function paidSubmission(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs ?? 120_000) });
  const body = await response.text();
  const payload = (() => { try { return JSON.parse(body); } catch { return null; } })();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${payload?.error?.message || body.slice(0, 500) || "paid submission failed"}`);
  return payload;
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

function videoPackageSchema(soraSceneCount, stockSceneCount) {
  return {
    name: "oneiro_ai_video_package",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        script: { type: "string" },
        scenePrompts: { type: "array", minItems: soraSceneCount, maxItems: soraSceneCount, items: { type: "string" } },
        stockSearchTerms: { type: "array", minItems: stockSceneCount, maxItems: stockSceneCount, items: { type: "string" } },
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
      required: ["script", "scenePrompts", "stockSearchTerms", "youtube"],
    },
  };
}

function wordCount(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function uniqueStrings(values, maximum) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].slice(0, maximum);
}

function parsePackage(content, soraSceneCount, stockSceneCount) {
  const parsed = JSON.parse(String(content ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  const script = String(parsed.script ?? "").trim();
  const scenePrompts = Array.isArray(parsed.scenePrompts) ? parsed.scenePrompts.map((value) => String(value).trim()) : [];
  const stockSearchTerms = Array.isArray(parsed.stockSearchTerms) ? parsed.stockSearchTerms.map((value) => String(value).trim()) : [];
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
  if (scenePrompts.length !== soraSceneCount || scenePrompts.some((prompt) => prompt.length < 80)) errors.push(`expected ${soraSceneCount} detailed AI video scene prompts`);
  if (stockSearchTerms.length !== stockSceneCount || stockSearchTerms.some((term) => term.length < 3 || term.length > 80)) errors.push(`expected ${stockSceneCount} concise Pexels search terms`);
  if (!youtubeMetadata.title || youtubeMetadata.title.length > 70) errors.push("YouTube title must be 1–70 characters");
  if (!youtubeMetadata.description) errors.push("description is missing");
  if (youtubeMetadata.tags.length < 10) errors.push("expected 10–15 unique tags");
  if (youtubeMetadata.hashtags.length < 3) errors.push("expected 3–5 unique hashtags");
  const thumbnailWords = wordCount(youtubeMetadata.thumbnailText);
  if (thumbnailWords < 2 || thumbnailWords > 4) errors.push("thumbnail text must have 2–4 words");
  if (!youtubeMetadata.pinnedComment) errors.push("pinned comment is missing");
  if (errors.length) throw new Error(errors.join("; "));
  return { script, scenePrompts, stockSearchTerms, youtubeMetadata };
}

async function generatePackage(job, reference) {
  if (job.script && Array.isArray(job.scenePrompts) && job.scenePrompts.length === job.soraSceneCount && Array.isArray(job.stockSearchTerms) && job.stockSearchTerms.length === job.stockSceneCount && job.youtubeMetadata) {
    return { script: job.script, scenePrompts: job.scenePrompts, stockSearchTerms: job.stockSearchTerms, youtubeMetadata: job.youtubeMetadata, tokenUsage: job.tokenUsage };
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
        response_format: { type: "json_schema", json_schema: videoPackageSchema(job.soraSceneCount, job.stockSceneCount) },
        messages: [
          {
            role: "system",
            content: `Create an English-only YouTube Short production package. Write a natural 65–75-word voice-over, exactly ${job.soraSceneCount} independent AI video scene prompts, and exactly ${job.stockSceneCount} concise Pexels stock-video search terms. Every video prompt must independently specify the subject, location and environment, natural motion, camera movement, lighting, mood, photorealistic detail, and stable geometry. Every video prompt must explicitly prohibit dialogue, captions, visible text, logos, watermarks, recognizable public figures, copyrighted characters, and copyrighted music. Do not depict real people in generated footage. Stock search terms must be concrete, visual, varied, safe, and likely to return vertical footage relevant to successive parts of the narration. The YouTube title must be accurate and at most 70 characters. Return 10–15 tags, 3–5 hashtags without #, 2–4 words of thumbnail text, a pinned comment, and category. Do not use markdown.`,
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
      const generated = parsePackage(payload?.choices?.[0]?.message?.content, job.soraSceneCount, job.stockSceneCount);
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
  const states = Array.from({ length: job.soraSceneCount }, (_, index) => index === state.index ? state : sceneState(job, index));
  const ids = Array.from({ length: job.soraSceneCount }, (_, index) => states[index]?.taskId ?? null);
  job.sceneStates = states;
  job.providerTaskIds = ids;
  await updateJob(reference, { sceneStates: states, providerTaskIds: ids });
}

async function saveAllSceneStates(reference, job, states) {
  job.sceneStates = states;
  job.providerTaskIds = states.map((state) => state.taskId ?? null);
  await updateJob(reference, { sceneStates: states, providerTaskIds: job.providerTaskIds });
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

async function resolveBatchIdFromJournal(directory) {
  try {
    const batchId = (await readFile(path.join(directory, "sora-batch-id.txt"), "utf8")).trim();
    return /^batch_[A-Za-z0-9_-]+$/.test(batchId) ? batchId : "";
  } catch { return ""; }
}

async function findExistingBatchForJob(job) {
  const generation = String(Number(job.retryCount ?? 0));
  const payload = await requestWithRetries("https://api.openai.com/v1/batches?limit=100", { headers: authHeaders(), timeoutMs: 60_000 });
  return (Array.isArray(payload?.data) ? payload.data : [])
    .filter((batch) => batch?.endpoint === "/v1/videos" && batch?.metadata?.job_id === job.id && String(batch?.metadata?.generation ?? "0") === generation && batch?.status !== "cancelled")
    .sort((left, right) => Number(right.created_at ?? 0) - Number(left.created_at ?? 0))[0] ?? null;
}

async function createSoraBatch(job, reference, directory, prompts) {
  const states = Array.from({ length: job.soraSceneCount }, (_, index) => sceneState(job, index));
  for (const state of states) {
    const journalTaskId = await resolveTaskIdFromJournal(directory, state.index);
    if (!state.taskId && journalTaskId) state.taskId = journalTaskId;
  }
  const pending = states.filter((state) => !state.taskId && state.status !== "completed");
  if (!pending.length) {
    await saveAllSceneStates(reference, job, states);
    return "";
  }
  const journalBatchId = await resolveBatchIdFromJournal(directory);
  if (job.batchId || journalBatchId) {
    job.batchId = job.batchId || journalBatchId;
    await updateJob(reference, { batchId: job.batchId, batchStatus: job.batchStatus || "submitted" });
    return job.batchId;
  }
  const existingBatch = await findExistingBatchForJob(job);
  if (existingBatch?.id) {
    job.batchId = String(existingBatch.id);
    job.batchStatus = String(existingBatch.status || "submitted");
    await writeFile(path.join(directory, "sora-batch-id.txt"), `${job.batchId}\n`, { mode: 0o600 });
    await updateJob(reference, {
      batchId: job.batchId,
      batchInputFileId: String(existingBatch.input_file_id || ""),
      batchOutputFileId: String(existingBatch.output_file_id || ""),
      batchErrorFileId: String(existingBatch.error_file_id || ""),
      batchStatus: job.batchStatus,
    });
    return job.batchId;
  }
  if (!boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED", false)) {
    throw new Error("Paid Sora generation is disabled in this worker");
  }
  const model = env("SORA_VIDEO_MODEL") || "sora-2";
  const seconds = String(job.sceneSeconds);
  const jsonl = pending.map((state) => JSON.stringify({
    custom_id: `scene-${state.index + 1}`,
    method: "POST",
    url: "/v1/videos",
    body: {
      model,
      prompt: safeRetryPrompt(prompts[state.index], state.safePromptRetryCount),
      size: VIDEO_SIZE,
      seconds,
    },
  })).join("\n") + "\n";
  const form = new FormData();
  form.append("purpose", "batch");
  form.append("file", new Blob([jsonl], { type: "application/jsonl" }), `oneiro-${job.id}-sora.jsonl`);
  const inputFile = await requestWithRetries("https://api.openai.com/v1/files", {
    method: "POST",
    headers: authHeaders(),
    body: form,
    timeoutMs: 120_000,
  });
  if (!inputFile?.id) throw new Error("OpenAI batch input upload did not return a file id");
  const batch = await requestWithRetries("https://api.openai.com/v1/batches", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", "Idempotency-Key": `oneiro-${job.id}-sora-batch-${Number(job.retryCount ?? 0)}` }),
    body: JSON.stringify({ input_file_id: inputFile.id, endpoint: "/v1/videos", completion_window: "24h", metadata: { job_id: job.id, generation: String(Number(job.retryCount ?? 0)) } }),
    timeoutMs: 120_000,
  });
  if (!batch?.id) throw new Error("OpenAI batch create response did not return a batch id");
  job.batchId = String(batch.id);
  job.batchStatus = String(batch.status || "validating");
  for (const state of pending) {
    state.status = "submitted";
    state.progress = 0;
    state.error = "";
  }
  await writeFile(path.join(directory, "sora-batch-id.txt"), `${job.batchId}\n`, { mode: 0o600 });
  await saveAllSceneStates(reference, job, states);
  await updateJob(reference, {
    batchId: job.batchId,
    batchInputFileId: String(inputFile.id),
    batchStatus: job.batchStatus,
    stage: "sora-batch-submitted",
    providerUsage: { model, size: VIDEO_SIZE, requestedSeconds: pending.length * job.sceneSeconds, generatedSeconds: Number(job.generatedSeconds ?? 0) },
  });
  return job.batchId;
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

function parseJsonLines(buffer) {
  return buffer.toString("utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
}

async function applyBatchResults(job, reference, directory, batch) {
  const records = [];
  if (batch.output_file_id) {
    records.push(...parseJsonLines(await requestWithRetries(`https://api.openai.com/v1/files/${encodeURIComponent(batch.output_file_id)}/content`, { headers: authHeaders(), timeoutMs: 180_000 }, "buffer")));
  }
  if (batch.error_file_id) {
    records.push(...parseJsonLines(await requestWithRetries(`https://api.openai.com/v1/files/${encodeURIComponent(batch.error_file_id)}/content`, { headers: authHeaders(), timeoutMs: 180_000 }, "buffer")));
  }
  const states = Array.from({ length: job.soraSceneCount }, (_, index) => sceneState(job, index));
  for (const record of records) {
    const match = String(record?.custom_id ?? "").match(/^scene-(\d+)$/);
    if (!match) continue;
    const index = Number(match[1]) - 1;
    if (index < 0 || index >= states.length) continue;
    const state = states[index];
    const body = record?.response?.body;
    const statusCode = Number(record?.response?.status_code ?? 0);
    if (statusCode >= 200 && statusCode < 300 && body?.id) {
      state.taskId = String(body.id);
      state.status = body.status === "completed" ? "completed" : body.status === "failed" || body.status === "expired" ? "failed" : "submitted";
      state.progress = state.status === "completed" ? 100 : Number(body.progress ?? 0);
      state.error = state.status === "failed" ? cleanError(body?.error?.message || `Sora video ${body.status}`) : "";
      await writeFile(path.join(directory, `scene-${index + 1}-task-id.txt`), `${state.taskId}\n`, { mode: 0o600 });
    } else {
      state.status = "failed";
      state.error = cleanError(record?.error?.message || body?.error?.message || `Batch request failed with HTTP ${statusCode || "unknown"}`);
    }
  }
  for (const state of states) {
    if (!state.taskId && state.status !== "completed") {
      state.status = "failed";
      state.error ||= "Sora Batch completed without a result for this scene";
    }
  }
  await saveAllSceneStates(reference, job, states);
  await updateJob(reference, {
    batchStatus: batch.status,
    batchOutputFileId: batch.output_file_id || "",
    batchErrorFileId: batch.error_file_id || "",
  });
  const failed = states.find((state) => state.status === "failed");
  if (failed) {
    await updateJob(reference, { failedSceneIndex: failed.index, error: failed.error });
    throw new Error(`Sora scene ${failed.index + 1} failed in Batch: ${failed.error}`);
  }
}

async function pollSoraBatch(job, reference, directory) {
  const deadline = Date.now() + 25 * 60 * 60_000;
  while (!stopping && Date.now() < deadline) {
    const batch = await requestWithRetries(`https://api.openai.com/v1/batches/${encodeURIComponent(job.batchId)}`, { headers: authHeaders(), timeoutMs: 60_000 });
    job.batchStatus = String(batch?.status || "unknown");
    const total = Math.max(1, Number(batch?.request_counts?.total ?? job.soraSceneCount));
    const finished = Number(batch?.request_counts?.completed ?? 0) + Number(batch?.request_counts?.failed ?? 0);
    const progress = Math.min(99, Math.round((finished / total) * 100));
    const states = Array.from({ length: job.soraSceneCount }, (_, index) => {
      const state = sceneState(job, index);
      if (state.status !== "completed" && state.status !== "failed") {
        state.status = batch?.status === "validating" ? "submitted" : "rendering";
        state.progress = progress;
      }
      return state;
    });
    await saveAllSceneStates(reference, job, states);
    await updateJob(reference, { batchStatus: job.batchStatus, stage: `sora-batch-${job.batchStatus}`, progress: 18 + Math.round(progress * 0.5) });
    if (batch?.status === "completed") {
      await applyBatchResults(job, reference, directory, batch);
      return;
    }
    if (["failed", "expired", "cancelled"].includes(batch?.status)) {
      throw new Error(`Sora Batch ${batch.status}: ${batch?.errors?.data?.[0]?.message || "no output was produced"}`);
    }
    await heartbeat("processing", job.id);
    await delay(BATCH_POLL_INTERVAL_MS);
  }
  throw new Error(`Sora Batch polling stopped or timed out; retry will resume batch ${job.batchId}`);
}

async function downloadSoraScene(job, reference, directory, index) {
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
  if (!state.taskId) throw new Error(`Sora scene ${index + 1} has no video id after Batch completion`);
  if (state.status !== "completed") await pollSoraTask(job, reference, state);
  const video = await requestWithRetries(`https://api.openai.com/v1/videos/${encodeURIComponent(state.taskId)}/content`, {
    headers: authHeaders(), timeoutMs: 180_000,
  }, "buffer");
  await writeFile(output, video, { mode: 0o600 });
  if (!(await fileIsUsable(output, 20_000))) throw new Error(`Downloaded scene ${index + 1} is empty`);
  state.status = "completed";
  state.progress = 100;
  state.error = "";
  const generatedSeconds = Array.from({ length: job.soraSceneCount }, (_, sceneIndex) =>
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

async function ensureSoraScenes(job, reference, directory, prompts) {
  const states = Array.from({ length: job.soraSceneCount }, (_, index) => sceneState(job, index));
  let needsBatch = false;
  for (const state of states) {
    const output = path.join(directory, `scene-${state.index + 1}.mp4`);
    if (await fileIsUsable(output, 20_000)) {
      state.status = "completed";
      state.progress = 100;
    } else {
      const journalTaskId = await resolveTaskIdFromJournal(directory, state.index);
      if (!state.taskId && journalTaskId) state.taskId = journalTaskId;
      if (!state.taskId) needsBatch = true;
    }
  }
  await saveAllSceneStates(reference, job, states);
  if (needsBatch) {
    await createSoraBatch(job, reference, directory, prompts);
    if (job.batchId) await pollSoraBatch(job, reference, directory);
  }
  const clips = [];
  for (let index = 0; index < job.soraSceneCount; index += 1) clips.push(await downloadSoraScene(job, reference, directory, index));
  return clips;
}

function veoOperationJournal(directory, job, index) {
  return path.join(directory, `veo-scene-${index + 1}-operation-${Number(job.retryCount ?? 0)}.txt`);
}

async function resolveVeoOperationFromJournal(directory, job, index) {
  try {
    const operationName = (await readFile(veoOperationJournal(directory, job, index), "utf8")).trim();
    return /^projects\/[A-Za-z0-9_.-]+\/locations\/[A-Za-z0-9_-]+\/publishers\/google\/models\/[A-Za-z0-9_.-]+\/operations\/[A-Za-z0-9_-]+$/.test(operationName) ? operationName : "";
  } catch { return ""; }
}

async function submitVeoScene(job, reference, directory, prompt, state) {
  if (!boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED", false)) {
    throw new Error("Paid Veo generation is disabled in this worker");
  }
  const operation = await paidSubmission(veoEndpoint("predictLongRunning"), {
    method: "POST",
    headers: await vertexHeaders({ "Content-Type": "application/json; charset=utf-8" }),
    body: JSON.stringify({
      instances: [{ prompt: safeRetryPrompt(prompt, state.safePromptRetryCount) }],
      parameters: {
        storageUri: `gs://${bucket.name}/admin-ai-videos/${job.id}/veo-scenes/scene-${state.index + 1}/`,
        sampleCount: 1,
        durationSeconds: job.sceneSeconds,
        aspectRatio: "9:16",
        resolution: "720p",
        personGeneration: "allow_adult",
        enhancePrompt: true,
        generateAudio: false,
      },
    }),
    timeoutMs: 120_000,
  });
  if (!operation?.name) throw new Error(`Veo scene ${state.index + 1} submission did not return an operation name`);
  state.taskId = String(operation.name);
  state.status = "submitted";
  state.progress = 0;
  state.error = "";
  await writeFile(veoOperationJournal(directory, job, state.index), `${state.taskId}\n`, { mode: 0o600 });
  await saveSceneState(reference, job, state);
  await updateJob(reference, {
    stage: `veo-scene-${state.index + 1}-submitted`,
    providerUsage: {
      model: veoConfig().model,
      size: VIDEO_SIZE,
      requestedSeconds: job.sceneStates.filter((scene) => scene.taskId).length * job.sceneSeconds,
      generatedSeconds: Number(job.generatedSeconds ?? 0),
    },
  });
}

async function pollVeoScene(job, reference, state) {
  const deadline = Date.now() + 90 * 60_000;
  while (!stopping && Date.now() < deadline) {
    const operation = await requestWithRetries(veoEndpoint("fetchPredictOperation"), {
      method: "POST",
      headers: await vertexHeaders({ "Content-Type": "application/json; charset=utf-8" }),
      body: JSON.stringify({ operationName: state.taskId }),
      timeoutMs: 60_000,
    });
    if (operation?.error) {
      state.status = "failed";
      state.error = cleanError(operation.error.message || `Vertex AI error ${operation.error.code ?? "unknown"}`);
      await saveSceneState(reference, job, state);
      await updateJob(reference, { failedSceneIndex: state.index, error: state.error });
      throw new Error(`Veo scene ${state.index + 1} failed: ${state.error}`);
    }
    if (operation?.done) {
      const gcsUri = operation?.response?.videos?.[0]?.gcsUri;
      if (!gcsUri) {
        const reason = operation?.response?.raiMediaFilteredReasons?.join?.("; ") || "operation completed without a video";
        state.status = "failed";
        state.error = cleanError(reason);
        await saveSceneState(reference, job, state);
        await updateJob(reference, { failedSceneIndex: state.index, error: state.error });
        throw new Error(`Veo scene ${state.index + 1} failed: ${state.error}`);
      }
      state.status = "rendering";
      state.progress = 95;
      await saveSceneState(reference, job, state);
      return String(gcsUri);
    }
    state.status = "rendering";
    state.progress = Math.min(90, Math.max(10, Number(state.progress ?? 0) + 5));
    await saveSceneState(reference, job, state);
    await updateJob(reference, { stage: `veo-scene-${state.index + 1}-rendering`, progress: 18 + Math.round(((state.index + state.progress / 100) / job.soraSceneCount) * 56) });
    await heartbeat("processing", job.id);
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error(`Polling timed out for Veo scene ${state.index + 1}; retry will resume operation ${state.taskId}`);
}

async function downloadVeoScene(job, reference, directory, state, gcsUri) {
  const match = String(gcsUri).match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match || match[1] !== bucket.name) throw new Error(`Veo returned an unexpected Cloud Storage URI for scene ${state.index + 1}`);
  const output = path.join(directory, `scene-${state.index + 1}.mp4`);
  await bucket.file(match[2]).download({ destination: output });
  if (!(await fileIsUsable(output, 20_000))) throw new Error(`Downloaded Veo scene ${state.index + 1} is empty`);
  const info = await mediaInfo(output);
  if (!info.streams?.some((stream) => stream.codec_type === "video")) throw new Error(`Downloaded Veo scene ${state.index + 1} has no video stream`);
  state.status = "completed";
  state.progress = 100;
  state.error = "";
  const states = Array.from({ length: job.soraSceneCount }, (_, index) => index === state.index ? state : sceneState(job, index));
  const generatedSeconds = states.filter((scene) => scene.status === "completed").length * job.sceneSeconds;
  job.generatedSeconds = generatedSeconds;
  await saveSceneState(reference, job, state);
  await updateJob(reference, {
    generatedSeconds,
    providerUsage: {
      model: veoConfig().model,
      size: VIDEO_SIZE,
      requestedSeconds: states.filter((scene) => scene.taskId).length * job.sceneSeconds,
      generatedSeconds,
    },
  });
  return output;
}

async function ensureVeoScenes(job, reference, directory, prompts) {
  const clips = [];
  for (let index = 0; index < job.soraSceneCount; index += 1) {
    const output = path.join(directory, `scene-${index + 1}.mp4`);
    const state = sceneState(job, index);
    if (await fileIsUsable(output, 20_000)) {
      state.status = "completed";
      state.progress = 100;
      await saveSceneState(reference, job, state);
      clips.push(output);
      continue;
    }
    if (!state.taskId) state.taskId = await resolveVeoOperationFromJournal(directory, job, index);
    if (!state.taskId) await submitVeoScene(job, reference, directory, prompts[index], state);
    const gcsUri = await pollVeoScene(job, reference, state);
    clips.push(await downloadVeoScene(job, reference, directory, state, gcsUri));
  }
  return clips;
}

function bestPexelsFile(video) {
  return (Array.isArray(video?.video_files) ? video.video_files : [])
    .filter((file) => file?.link && String(file.file_type || "video/mp4").includes("mp4"))
    .map((file) => ({ file, score: (file.height > file.width ? 10_000 : 0) + (file.width >= 720 && file.height >= 1280 ? 5_000 : 0) - Math.abs(Number(file.width || 0) - 720) - Math.abs(Number(file.height || 0) - 1280) / 2 }))
    .sort((left, right) => right.score - left.score)[0]?.file ?? null;
}

async function searchPexelsVideo(searchTerm, usedIds) {
  const params = new URLSearchParams({ query: searchTerm, orientation: "portrait", size: "medium", per_page: "20" });
  const payload = await requestWithRetries(`https://api.pexels.com/videos/search?${params}`, {
    headers: { Authorization: pexelsApiKey() }, timeoutMs: 90_000,
  });
  for (const video of Array.isArray(payload?.videos) ? payload.videos : []) {
    if (usedIds.has(Number(video.id))) continue;
    const file = bestPexelsFile(video);
    if (file) return { video, file };
  }
  return null;
}

async function ensureStockScenes(job, reference, directory, searchTerms) {
  const clips = [];
  const assets = Array.isArray(job.stockAssets) ? [...job.stockAssets] : [];
  const usedIds = new Set(assets.map((asset) => Number(asset?.providerId)).filter(Boolean));
  for (let index = 0; index < job.stockSceneCount; index += 1) {
    const output = path.join(directory, `stock-scene-${index + 1}.mp4`);
    if (await fileIsUsable(output, 20_000)) {
      clips.push(output);
      continue;
    }
    await updateJob(reference, { stage: `stock-scene-${index + 1}-of-${job.stockSceneCount}`, progress: 70 + Math.round((index / Math.max(1, job.stockSceneCount)) * 7) });
    const searchTerm = String(searchTerms[index] || job.topic).trim();
    const result = await searchPexelsVideo(searchTerm, usedIds) || await searchPexelsVideo(job.topic, usedIds);
    if (!result) throw new Error(`Pexels returned no usable portrait video for stock scene ${index + 1}: ${searchTerm}`);
    usedIds.add(Number(result.video.id));
    const video = await requestWithRetries(result.file.link, { timeoutMs: 180_000 }, "buffer");
    await writeFile(output, video, { mode: 0o600 });
    if (!(await fileIsUsable(output, 20_000))) throw new Error(`Downloaded Pexels scene ${index + 1} is empty`);
    assets[index] = {
      index,
      searchTerm,
      provider: "pexels",
      providerId: Number(result.video.id) || null,
      photographer: String(result.video.user?.name || ""),
      sourceUrl: String(result.video.url || "https://www.pexels.com"),
    };
    job.stockAssets = assets;
    await updateJob(reference, { stockAssets: assets });
    clips.push(output);
  }
  return clips;
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
      "-y", "-stream_loop", "-1", "-i", clips[index], "-t", String(job.sceneSeconds), "-an",
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
    telegramMessageId = await sendTelegram(finalPath, `${job.topic}\nEnglish · ${job.mode === "veo" ? "Veo 3.1 Lite" : `Sora ${job.mode}`}`);
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
    if (job.mode !== "preview" && job.mode !== "standard" && job.mode !== "combined" && job.mode !== "veo") throw new Error("Invalid job mode");
    if (typeof job.topic !== "string" || job.topic.trim().length < 5 || job.topic.trim().length > 500) throw new Error("Invalid job topic");
    const trustedMode = job.mode === "preview"
      ? { sceneCount: 1, soraSceneCount: 1, stockSceneCount: 0, sceneSeconds: 4 }
      : job.mode === "combined"
        ? { sceneCount: 4, soraSceneCount: 1, stockSceneCount: 3, sceneSeconds: 8 }
        : job.mode === "veo"
          ? { sceneCount: 4, soraSceneCount: 4, stockSceneCount: 0, sceneSeconds: 8 }
        : { sceneCount: 4, soraSceneCount: 4, stockSceneCount: 0, sceneSeconds: 8 };
    job.sceneCount = trustedMode.sceneCount;
    job.soraSceneCount = trustedMode.soraSceneCount;
    job.stockSceneCount = trustedMode.stockSceneCount;
    job.sceneSeconds = trustedMode.sceneSeconds;
    job.language = "en-US";
    const current = (await reference.get()).data();
    job = { ...job, ...current, id: job.id };
    job.sceneCount = trustedMode.sceneCount;
    job.soraSceneCount = trustedMode.soraSceneCount;
    job.stockSceneCount = trustedMode.stockSceneCount;
    job.sceneSeconds = trustedMode.sceneSeconds;
    job.stockSearchTerms = Array.isArray(job.stockSearchTerms) ? job.stockSearchTerms : [];
    job.stockAssets = Array.isArray(job.stockAssets) ? job.stockAssets : [];
    job.language = "en-US";
    await updateJob(reference, { stage: "writing-script", progress: Math.max(2, Number(job.progress ?? 0)) });
    const generated = await generatePackage(job, reference);
    if (job.mode === "combined" && !generated.youtubeMetadata.description.includes("pexels.com")) {
      generated.youtubeMetadata = {
        ...generated.youtubeMetadata,
        description: `${generated.youtubeMetadata.description}\n\nStock footage provided by Pexels: https://www.pexels.com`,
      };
      await updateJob(reference, { youtubeMetadata: generated.youtubeMetadata });
    }
    Object.assign(job, generated);
    const narrationPath = await ensureNarration(job, reference, directory, generated.script);
    await updateJob(reference, { stage: "generating-scenes", progress: 18 });
    const clips = job.mode === "veo"
      ? await ensureVeoScenes(job, reference, directory, generated.scenePrompts)
      : await ensureSoraScenes(job, reference, directory, generated.scenePrompts);
    if (job.stockSceneCount > 0) clips.push(...await ensureStockScenes(job, reference, directory, generated.stockSearchTerms));
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
      try { telegramMessageId = await sendTelegram(rendered.finalPath, `${job.topic}\nEnglish · ${job.mode === "combined" ? "Sora + Pexels" : job.mode === "veo" ? "Veo 3.1 Lite" : `Sora Batch ${job.mode}`}`); }
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
    pexelsApiKey: false,
    vertexAiProject: false,
    ffmpeg: false,
    ffprobe: false,
    mediaProbe: false,
  };
  try {
    const account = serviceAccount();
    checks.firebaseCredentials = Boolean(account?.project_id && account?.private_key && account?.client_email);
    checks.vertexAiProject = Boolean(veoConfig().projectId);
  } catch {}
  try { checks.pexelsApiKey = Boolean(pexelsApiKey()); } catch {}
  try { await runProcess(ffmpegBin(), ["-version"]); checks.ffmpeg = true; } catch {}
  try { await runProcess(ffprobeBin(), ["-version"]); checks.ffprobe = true; } catch {}
  checks.mediaProbe = checks.ffprobe || checks.ffmpeg;
  const required = ["openAiKey", "firebaseCredentials", "storageBucket", "vertexAiProject", "ffmpeg", "mediaProbe"];
  const ok = required.every((key) => checks[key]);
  console.log(JSON.stringify({
    ok,
    readOnly: true,
    checks,
    paidGenerationEnabled: boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED", false),
    soraModel: env("SORA_VIDEO_MODEL") || "sora-2",
    soraSubmission: "batch",
    veoModel: veoConfig().model,
    veoLocation: veoConfig().location,
    veoPricePerSecondUsd: Number(env("VEO_LITE_PRICE_PER_SECOND_USD") || 0.03),
    batchCompletionWindow: "24h",
    pricePerSecondUsd: Number(env("SORA_BATCH_PRICE_PER_SECOND_USD") || 0.05),
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
  console.log(`[ai-video-worker] ready on ${hostname()} · Sora Batch + Combined + Veo Lite · English only · paid calls ${boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED") ? "enabled" : "disabled"}`);
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
