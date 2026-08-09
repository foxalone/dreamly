#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { createWriteStream, existsSync, readFileSync, readdirSync } from "node:fs";
import { hostname, homedir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const MAX_DURATION_SECONDS = 45;
const POLL_INTERVAL_MS = 4_000;
const JOBS_COLLECTION = "adminVideoJobs";
const WORKER_DOCUMENT = "adminSystem/videoWorker";
const ENGLISH_VOICE = "en-US-AriaNeural-Female";

function env(name) {
  const value = process.env[name]?.trim() ?? "";
  return value.replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function requiredEnv(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(candidate.slice(0, index + 1));
    }
  }
  return null;
}

function serviceAccount() {
  const json = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (json) {
    try { return JSON.parse(json); }
    catch {
      const parsed = jsonFromEnvFile("FIREBASE_SERVICE_ACCOUNT_JSON");
      if (parsed) return parsed;
    }
  }
  const configuredPath = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!configuredPath) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  const absolutePath = path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function initializeFirebase() {
  const account = serviceAccount();
  const storageBucket = requiredEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (!getApps().length) initializeApp({ credential: cert(account), storageBucket });
  return { db: getFirestore(), bucket: getStorage().bucket(storageBucket) };
}

const { db, bucket } = initializeFirebase();
let stopping = false;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cleanError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, "bot[redacted]")
    .slice(0, 2_000);
}

async function heartbeat(state = "idle", currentJobId = "") {
  await db.doc(WORKER_DOCUMENT).set(
    { state, currentJobId, host: hostname(), lastSeenAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

async function claimNextJob() {
  const snapshot = await db.collection(JOBS_COLLECTION).where("status", "==", "queued").limit(10).get();
  if (snapshot.empty) return null;
  const candidates = [...snapshot.docs].sort((left, right) => {
    const leftTime = left.get("createdAt")?.toMillis?.() ?? 0;
    const rightTime = right.get("createdAt")?.toMillis?.() ?? 0;
    return leftTime - rightTime;
  });
  for (const candidate of candidates) {
    let claimed = false;
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(candidate.ref);
      if (!fresh.exists || fresh.get("status") !== "queued") return;
      transaction.update(candidate.ref, {
        status: "processing",
        stage: "writing-script",
        language: "en-US",
        startedAt: FieldValue.serverTimestamp(),
        error: "",
      });
      claimed = true;
    });
    if (claimed) return { id: candidate.id, ...candidate.data(), language: "en-US" };
  }
  return null;
}

function parseJsonContent(content) {
  const text = String(content ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(text);
  const script = typeof parsed.script === "string" ? parsed.script.trim() : "";
  const searchTerms = Array.isArray(parsed.searchTerms)
    ? parsed.searchTerms.map((term) => String(term).trim()).filter(Boolean).slice(0, 8)
    : [];
  const youtube = parsed.youtube && typeof parsed.youtube === "object" ? parsed.youtube : {};
  const youtubeMetadata = {
    title: String(youtube.title ?? "").trim().slice(0, 100),
    description: String(youtube.description ?? "").trim().slice(0, 5_000),
    tags: Array.isArray(youtube.tags) ? youtube.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20) : [],
    hashtags: Array.isArray(youtube.hashtags)
      ? youtube.hashtags.map((tag) => String(tag).trim().replace(/^#/, "")).filter(Boolean).slice(0, 5)
      : [],
    thumbnailText: String(youtube.thumbnailText ?? "").trim().slice(0, 50),
    pinnedComment: String(youtube.pinnedComment ?? "").trim().slice(0, 1_000),
    category: String(youtube.category ?? "Education").trim().slice(0, 80),
  };
  if (!script || searchTerms.length < 3 || !youtubeMetadata.title || !youtubeMetadata.description || youtubeMetadata.tags.length < 5) {
    throw new Error("The model returned incomplete video or YouTube metadata");
  }
  return { script, searchTerms, youtubeMetadata };
}

async function createScript(topic) {
  const apiKey = env("ONEIRO_OPENAI_API_KEY") || requiredEnv("OPENAI_API_KEY");
  const model = env("VIDEO_OPENAI_MODEL") || env("OPENAI_DREAM_MODEL") || "gpt-4o-mini";
  const baseUrl = (env("VIDEO_OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Create a concise English vertical-video script and a complete English YouTube Shorts publishing package. " +
            "Return JSON only with keys script, searchTerms, and youtube. youtube must contain title, description, tags, " +
            "hashtags, thumbnailText, pinnedComment, and category. The narration must be natural, engaging, and accurate, " +
            "with no markdown, scene labels, unsupported certainty, or misleading clickbait. searchTerms must contain 5 to 8 " +
            "short English Pexels queries. The title must be accurate and at most 70 characters. The description must summarize " +
            "the value, include natural search phrases, and end with 3 hashtags. Provide 10 to 15 comma-free tags, 3 to 5 " +
            "hashtags without #, thumbnail text of 2 to 4 words, a short pinned question, and the best YouTube category.",
        },
        {
          role: "user",
          content:
            `Topic: ${topic}\nLanguage: English only.\n` +
            "Write 75 to 90 spoken words designed to finish comfortably within 45 seconds. Open with the strongest useful detail.",
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${payload?.error?.message ?? "generation failed"}`);
  const result = parseJsonContent(payload?.choices?.[0]?.message?.content);
  const prompt = Number(payload?.usage?.prompt_tokens ?? 0);
  const completion = Number(payload?.usage?.completion_tokens ?? 0);
  return {
    ...result,
    usage: {
      prompt,
      completion,
      total: Number(payload?.usage?.total_tokens ?? prompt + completion),
      model: String(payload?.model ?? model),
    },
  };
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderrTail = "";
    const log = options.logPath ? createWriteStream(options.logPath, { flags: "a" }) : null;
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout = (stdout + text).slice(-100_000);
      log?.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrTail = (stderrTail + text).slice(-8_000);
      log?.write(text);
    });
    child.on("error", (error) => { log?.end(); reject(error); });
    child.on("close", (code) => {
      log?.end();
      if (code === 0) resolve({ stdout, stderrTail });
      else reject(new Error(`${path.basename(command)} exited with ${code}: ${stderrTail.slice(-2_000)}`));
    });
  });
}

function resolveFfmpeg(root) {
  const configured = env("VIDEO_FFMPEG_BIN");
  if (configured && existsSync(configured)) return configured;
  const binaries = path.join(root, ".venv", "lib", "python3.11", "site-packages", "imageio_ffmpeg", "binaries");
  if (existsSync(binaries)) {
    const binary = readdirSync(binaries).find((name) => name.startsWith("ffmpeg-") && !name.endsWith(".md"));
    if (binary) return path.join(binaries, binary);
  }
  throw new Error("MoneyPrinterTurbo ffmpeg binary was not found");
}

function parseCliResult(stdout) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const payload = JSON.parse(lines[index]);
      const video = payload?.result?.videos?.[0];
      if (typeof video === "string" && video) return { taskId: payload.task_id, video };
    } catch {}
  }
  throw new Error("MoneyPrinterTurbo completed without returning a video path");
}

async function renderVideo(job, script, searchTerms) {
  const root = env("MONEYPRINTERTURBO_ROOT") || path.join(homedir(), "MoneyPrinterTurbo");
  const uv = env("UV_BIN") || path.join(homedir(), ".local", "bin", "uv");
  if (!existsSync(path.join(root, "cli.py"))) throw new Error(`MoneyPrinterTurbo is not installed at ${root}`);
  if (!existsSync(uv)) throw new Error(`uv is not installed at ${uv}`);
  const taskId = randomUUID();
  const logPath = path.join(root, ".agent-logs", "moneyprinterturbo-video", `oneiro-${job.id}.log`);
  const args = [
    "run", "python", "cli.py",
    "--video-script", script,
    "--video-terms", searchTerms.join(","),
    "--video-language", "en-US",
    "--voice-name", ENGLISH_VOICE,
    "--video-aspect", "9:16",
    "--video-count", "1",
    "--video-clip-duration", "5",
    "--bgm-type", "random",
    "--subtitle-enabled",
    "--task-id", taskId,
  ];
  const result = await runProcess(uv, args, {
    cwd: root,
    logPath,
    env: { ...process.env, PATH: `${path.dirname(uv)}:${process.env.PATH ?? ""}` },
  });
  return { ...parseCliResult(result.stdout), root, logPath };
}

async function enforceDuration(jobId, rendered) {
  const ffmpeg = resolveFfmpeg(rendered.root);
  const output = path.join(path.dirname(rendered.video), `oneiro-${jobId}-max-${MAX_DURATION_SECONDS}s.mp4`);
  await runProcess(ffmpeg, [
    "-y", "-i", rendered.video, "-t", String(MAX_DURATION_SECONDS),
    "-c:v", "libx264", "-preset", "medium", "-crf", "25",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output,
  ], { cwd: rendered.root, logPath: rendered.logPath });
  return output;
}

async function uploadVideo(jobId, filePath) {
  const destination = `admin-videos/${jobId}.mp4`;
  const downloadToken = randomUUID();
  await bucket.upload(filePath, {
    destination,
    resumable: false,
    metadata: {
      contentType: "video/mp4",
      cacheControl: "private, max-age=3600",
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${downloadToken}`;
}

async function sendTelegram(filePath, caption) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_PERSONAL_CHAT_ID");
  if (!token || !chatId) throw new Error("Telegram credentials are not configured");
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption.slice(0, 1024));
  form.append("supports_streaming", "true");
  form.append("video", new Blob([readFileSync(filePath)], { type: "video/mp4" }), "oneiro-short.mp4");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
  const payload = await response.json();
  if (!response.ok || !payload?.ok) throw new Error(`Telegram ${response.status}: ${payload?.description ?? "send failed"}`);
  return Number(payload?.result?.message_id ?? 0);
}

async function processJob(job) {
  const reference = db.collection(JOBS_COLLECTION).doc(job.id);
  let usage = null;
  try {
    await heartbeat("processing", job.id);
    const generated = await createScript(job.topic);
    usage = generated.usage;
    await reference.update({
      stage: "rendering",
      tokenUsage: usage,
      script: generated.script,
      searchTerms: generated.searchTerms,
      youtubeMetadata: generated.youtubeMetadata,
    });
    const rendered = await renderVideo(job, generated.script, generated.searchTerms);
    await reference.update({ stage: "enforcing-45-second-limit", localTaskId: rendered.taskId });
    const finalPath = await enforceDuration(job.id, rendered);
    await reference.update({ stage: "uploading" });
    const videoUrl = await uploadVideo(job.id, finalPath);
    let telegramMessageId = null;
    let telegramError = "";
    if (job.sendToTelegram !== false) {
      await reference.update({ stage: "sending-telegram" });
      try { telegramMessageId = await sendTelegram(finalPath, `${job.topic} — English`); }
      catch (error) { telegramError = cleanError(error); }
    }
    await reference.update({
      status: "completed",
      stage: "completed",
      completedAt: FieldValue.serverTimestamp(),
      tokenUsage: usage,
      videoUrl,
      telegramMessageId,
      telegramError,
      localVideoPath: finalPath,
      error: "",
    });
  } catch (error) {
    const message = cleanError(error);
    console.error(`[oneiro-video-worker] job ${job.id} failed: ${message}`);
    await reference.update({
      status: "failed",
      stage: "failed",
      completedAt: FieldValue.serverTimestamp(),
      ...(usage ? { tokenUsage: usage } : {}),
      error: message,
    });
  } finally {
    await heartbeat("idle", "");
  }
}

async function main() {
  if (process.argv.includes("--check")) {
    if (!(env("ONEIRO_OPENAI_API_KEY") || env("OPENAI_API_KEY"))) throw new Error("Missing Oneiro OpenAI API key");
    requiredEnv("TELEGRAM_BOT_TOKEN");
    requiredEnv("TELEGRAM_PERSONAL_CHAT_ID");
    const root = env("MONEYPRINTERTURBO_ROOT") || path.join(homedir(), "MoneyPrinterTurbo");
    const uv = env("UV_BIN") || path.join(homedir(), ".local", "bin", "uv");
    if (!existsSync(path.join(root, "cli.py"))) throw new Error(`MoneyPrinterTurbo is not installed at ${root}`);
    if (!existsSync(uv)) throw new Error(`uv is not installed at ${uv}`);
    resolveFfmpeg(root);
    await heartbeat("idle", "");
    console.log(JSON.stringify({
      ok: true,
      firebaseProject: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
      storageBucket: bucket.name,
      moneyPrinterTurbo: root,
      model: env("VIDEO_OPENAI_MODEL") || env("OPENAI_DREAM_MODEL") || "gpt-4o-mini",
      telegram: "configured",
      language: "English only",
      maxDurationSeconds: MAX_DURATION_SECONDS,
    }));
    return;
  }
  console.log(`[oneiro-video-worker] ready on ${hostname()}, English only, max ${MAX_DURATION_SECONDS}s`);
  await heartbeat();
  while (!stopping) {
    const job = await claimNextJob();
    if (job) {
      console.log(`[oneiro-video-worker] processing ${job.id}: ${job.topic}`);
      await processJob(job);
      continue;
    }
    await heartbeat();
    await delay(POLL_INTERVAL_MS);
  }
  await heartbeat("offline", "");
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

main().catch((error) => {
  console.error(`[oneiro-video-worker] fatal: ${cleanError(error)}`);
  process.exitCode = 1;
});
