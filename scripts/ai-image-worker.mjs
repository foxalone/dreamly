#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const JOBS_COLLECTION = "adminAiImageJobs";
const WORKER_DOCUMENT = "adminSystem/aiImageWorker";
const POLL_IDLE_MS = 4_000;
const LEASE_MS = 90_000;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

const SORA_RATES = {
  textInputPerMillion: 2,
  imageInputPerMillion: 2.5,
  imageOutputPerMillion: 8,
};

const VEO_RATES = {
  textInputPerMillion: 0.5,
  textOutputPerMillion: 3,
  imageOutputPerMillion: 60,
};

let db;
let bucket;
let googleCredential;
let firebaseServiceAccount;
let stopping = false;

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

function paidGenerationEnabled() {
  const imageFlag = env("AI_IMAGE_PAID_GENERATION_ENABLED").toLowerCase();
  if (imageFlag === "true" || imageFlag === "false") return imageFlag === "true";
  return boolEnv("AI_VIDEO_PAID_GENERATION_ENABLED", false);
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

function workRoot() {
  const configured = env("AI_IMAGE_WORK_DIR") || env("AI_VIDEO_WORK_DIR");
  return path.resolve(configured || path.join(process.cwd(), ".ai-image-work"));
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function roundUsd(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function tokensToUsd(tokens, perMillion) {
  return (Number(tokens) / 1_000_000) * perMillion;
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

function extensionFor(mimeType) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

function detectImageMime(buffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return "";
}

function veoImageConfig() {
  const account = serviceAccount();
  return {
    projectId: env("VEO_PROJECT_ID") || env("GOOGLE_CLOUD_PROJECT") || String(account.project_id || ""),
    location: env("VEO_IMAGE_LOCATION") || "global",
    model: env("VEO_IMAGE_MODEL") || "gemini-3.1-flash-image",
  };
}

async function vertexHeaders(extra = {}) {
  if (!googleCredential) googleCredential = cert(serviceAccount());
  const token = await googleCredential.getAccessToken();
  if (!token?.access_token) throw new Error("Unable to obtain a Google Cloud access token for Vertex AI");
  const { projectId } = veoImageConfig();
  return {
    Authorization: `Bearer ${token.access_token}`,
    "x-goog-user-project": projectId,
    ...extra,
  };
}

function veoImageEndpoint() {
  const { projectId, location, model } = veoImageConfig();
  if (!projectId) throw new Error("Veo image needs VEO_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or project_id in the service account");
  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
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

async function updateJob(reference, patch) {
  await reference.set(patch, { merge: true });
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

async function paidJson(url, options, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs ?? 180_000) });
    const body = await response.text();
    const payload = (() => { try { return JSON.parse(body); } catch { return null; } })();
    if (response.ok) return payload;
    const message = payload?.error?.message || payload?.message || body.slice(0, 500) || "paid request failed";
    const error = new Error(`HTTP ${response.status}: ${message}`);
    error.status = response.status;
    if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts - 1) throw error;
    lastError = error;
    await delay(Math.min(20_000, 2_000 * (2 ** attempt)));
  }
  throw lastError ?? new Error("Paid request failed");
}

function soraUsageCost(usage, model) {
  const input = Number(usage?.input_tokens ?? 0);
  const output = Number(usage?.output_tokens ?? 0);
  const textInput = Number(usage?.input_tokens_details?.text_tokens ?? input);
  const imageInput = Number(usage?.input_tokens_details?.image_tokens ?? 0);
  const usd = tokensToUsd(textInput, SORA_RATES.textInputPerMillion)
    + tokensToUsd(imageInput, SORA_RATES.imageInputPerMillion)
    + tokensToUsd(output, SORA_RATES.imageOutputPerMillion);
  return {
    tokenUsage: {
      input,
      output,
      total: Number(usage?.total_tokens ?? input + output),
      imageOutput: output,
      textOutput: 0,
      model,
    },
    actualCostUsd: roundUsd(usd),
  };
}

function veoUsageCost(usage, model) {
  const details = [
    ...(usage?.promptTokensDetails ?? usage?.prompt_tokens_details ?? []),
    ...(usage?.candidatesTokensDetails ?? usage?.candidates_tokens_details ?? []),
  ];
  const imageOutput = details
    .filter((item) => String(item?.modality || "").toUpperCase() === "IMAGE" && Number(item?.tokenCount ?? item?.token_count) > 0)
    .reduce((sum, item) => sum + Number(item.tokenCount ?? item.token_count), 0);
  const prompt = Number(usage?.promptTokenCount ?? usage?.prompt_token_count ?? 0);
  const candidates = Number(usage?.candidatesTokenCount ?? usage?.candidates_token_count ?? 0);
  const thoughts = Number(usage?.thoughtsTokenCount ?? usage?.thoughts_token_count ?? 0);
  const imageTokens = imageOutput || candidates;
  const textOutput = imageOutput ? Math.max(0, candidates - imageOutput) + thoughts : thoughts;
  const usd = tokensToUsd(prompt, VEO_RATES.textInputPerMillion)
    + tokensToUsd(textOutput, VEO_RATES.textOutputPerMillion)
    + tokensToUsd(imageTokens, VEO_RATES.imageOutputPerMillion);
  return {
    tokenUsage: {
      input: prompt,
      output: candidates + thoughts,
      total: Number(usage?.totalTokenCount ?? usage?.total_token_count ?? prompt + candidates + thoughts),
      imageOutput: imageTokens,
      textOutput,
      model,
    },
    actualCostUsd: roundUsd(usd),
  };
}

async function generateSoraImage(prompt) {
  const model = env("SORA_IMAGE_MODEL") || "gpt-image-1-mini";
  const size = env("SORA_IMAGE_SIZE") || "1024x1536";
  const quality = env("SORA_IMAGE_QUALITY") || "medium";
  const body = {
    model,
    prompt,
    size,
    quality,
    n: 1,
    output_format: "jpeg",
    output_compression: 80,
  };
  let payload;
  try {
    payload = await paidJson("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      timeoutMs: 180_000,
    });
  } catch (error) {
    if (!String(error?.message || "").includes("HTTP 400")) throw error;
    payload = await paidJson("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
      timeoutMs: 180_000,
    });
  }
  const encoded = payload?.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI image response did not include image data");
  const { tokenUsage, actualCostUsd } = soraUsageCost(payload.usage, model);
  return {
    buffer: Buffer.from(encoded, "base64"),
    mimeType: "image/jpeg",
    tokenUsage,
    actualCostUsd: actualCostUsd || Number(env("SORA_IMAGE_PRICE_USD") || 0.015),
    model,
    size,
    quality,
  };
}

function lastInlineImage(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const inline = parts[index]?.inlineData || parts[index]?.inline_data;
    if (inline?.data) {
      return {
        data: inline.data,
        mimeType: String(inline.mimeType || inline.mime_type || "image/png"),
      };
    }
  }
  return null;
}

async function generateVeoImage(prompt) {
  const { model } = veoImageConfig();
  const imageSize = env("VEO_IMAGE_SIZE") || "1K";
  const aspectRatio = env("VEO_IMAGE_ASPECT_RATIO") || "9:16";
  const payload = await paidJson(veoImageEndpoint(), {
    method: "POST",
    headers: await vertexHeaders({ "Content-Type": "application/json; charset=utf-8" }),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio, imageSize },
      },
    }),
    timeoutMs: 180_000,
  });
  const image = lastInlineImage(payload);
  if (!image) {
    const finish = payload?.candidates?.[0]?.finishReason || payload?.promptFeedback?.blockReason || "no image part";
    throw new Error(`Vertex image response did not include image data (${finish})`);
  }
  const { tokenUsage, actualCostUsd } = veoUsageCost(payload.usageMetadata || payload.usage_metadata, model);
  return {
    buffer: Buffer.from(image.data, "base64"),
    mimeType: image.mimeType,
    tokenUsage,
    actualCostUsd: actualCostUsd || Number(env("VEO_IMAGE_PRICE_USD") || 0.07),
    model,
    size: imageSize,
    quality: "default",
  };
}

async function uploadImage(jobId, filePath, mimeType) {
  const extension = extensionFor(mimeType);
  const destination = `admin-ai-images/${jobId}/image.${extension}`;
  const token = randomUUID();
  await bucket.upload(filePath, {
    destination,
    resumable: false,
    metadata: {
      contentType: mimeType,
      cacheControl: "private, max-age=3600",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return {
    path: destination,
    url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`,
  };
}

async function sendTelegram(filePath, mimeType, caption) {
  const token = requiredEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requiredEnv("TELEGRAM_PERSONAL_CHAT_ID");
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption.slice(0, 1_024));
  form.append("photo", new Blob([await readFile(filePath)], { type: mimeType }), `oneiro-image.${extensionFor(mimeType)}`);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json();
  if (!payload?.ok) throw new Error(`Telegram: ${payload?.description ?? "send failed"}`);
  return Number(payload?.result?.message_id ?? 0);
}

async function ensureLocalImage(job, directory) {
  const filePath = path.join(directory, `image.${extensionFor(job.mimeType || "image/png")}`);
  if (existsSync(filePath)) return filePath;
  if (!job.imageStoragePath) throw new Error("Stored image path is unavailable for Telegram retry");
  await bucket.file(job.imageStoragePath).download({ destination: filePath });
  return filePath;
}

function costCaption(job, actualCostUsd) {
  const usd = Number.isFinite(actualCostUsd) ? actualCostUsd : Number(job.estimatedCostUsd ?? 0);
  const provider = job.provider === "veo" ? "Veo / Gemini Flash Image" : "Sora / GPT Image mini";
  const title = String(job.subject || job.prompt || "").split("\n")[0].slice(0, 200);
  return `${title}\n${provider} · approx ${usd.toFixed(4)} USD`;
}

async function processJob(job) {
  const reference = db.collection(JOBS_COLLECTION).doc(job.id);
  const directory = path.join(workRoot(), job.id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const heartbeatTimer = setInterval(() => { void heartbeat("processing", job.id); }, 20_000);
  try {
    if (job.retryTelegramOnly) {
      const filePath = await ensureLocalImage(job, directory);
      const telegramMessageId = await sendTelegram(filePath, job.mimeType || "image/png", costCaption(job, job.actualCostUsd));
      await updateJob(reference, {
        status: "completed",
        stage: "completed",
        progress: 100,
        telegramMessageId,
        telegramError: "",
        telegramStatus: "delivered",
        retryTelegramOnly: false,
        completedAt: FieldValue.serverTimestamp(),
        leaseOwner: "",
        leaseExpiresAt: null,
      });
      return;
    }

    await updateJob(reference, { stage: "generating", progress: 15 });
    const generated = job.provider === "veo"
      ? await generateVeoImage(job.prompt)
      : await generateSoraImage(job.prompt);
    const mimeType = detectImageMime(generated.buffer) || generated.mimeType;
    const filePath = path.join(directory, `image.${extensionFor(mimeType)}`);
    await writeFile(filePath, generated.buffer);

    await updateJob(reference, { stage: "uploading", progress: 80 });
    const uploaded = await uploadImage(job.id, filePath, mimeType);

    let telegramMessageId = null;
    let telegramError = "";
    let telegramStatus = job.sendToTelegram === false ? "disabled" : "pending";
    if (job.sendToTelegram !== false) {
      try {
        telegramMessageId = await sendTelegram(filePath, mimeType, costCaption(job, generated.actualCostUsd));
        telegramStatus = "delivered";
      } catch (error) {
        telegramError = cleanError(error);
        telegramStatus = "failed";
      }
    }

    await updateJob(reference, {
      status: "completed",
      stage: "completed",
      progress: 100,
      actualCostUsd: generated.actualCostUsd,
      tokenUsage: generated.tokenUsage,
      providerUsage: {
        model: generated.model,
        size: generated.size,
        quality: generated.quality,
        aspectRatio: "9:16",
      },
      imageUrl: uploaded.url,
      imageStoragePath: uploaded.path,
      mimeType,
      telegramMessageId,
      telegramError,
      telegramStatus,
      error: "",
      completedAt: FieldValue.serverTimestamp(),
      leaseOwner: "",
      leaseExpiresAt: null,
    });
  } catch (error) {
    const message = cleanError(error);
    console.error(`[ai-image-worker] job ${job.id} failed: ${message}`);
    await updateJob(reference, {
      status: "failed",
      stage: "failed",
      error: message,
      completedAt: FieldValue.serverTimestamp(),
      leaseOwner: "",
      leaseExpiresAt: null,
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
    vertexAiProject: false,
  };
  try {
    const account = serviceAccount();
    checks.firebaseCredentials = Boolean(account?.project_id && account?.private_key && account?.client_email);
    checks.vertexAiProject = Boolean(veoImageConfig().projectId);
  } catch {}
  const required = ["openAiKey", "firebaseCredentials", "storageBucket", "vertexAiProject"];
  const ok = required.every((key) => checks[key]);
  console.log(JSON.stringify({
    ok,
    readOnly: true,
    checks,
    paidGenerationEnabled: paidGenerationEnabled(),
    soraModel: env("SORA_IMAGE_MODEL") || "gpt-image-1-mini",
    veoModel: veoImageConfig().model,
    veoLocation: veoImageConfig().location,
    soraPriceUsd: Number(env("SORA_IMAGE_PRICE_USD") || 0.015),
    veoPriceUsd: Number(env("VEO_IMAGE_PRICE_USD") || 0.07),
  }, null, 2));
  if (!ok) process.exitCode = 1;
}

async function main() {
  if (process.argv.includes("--check")) return runCheck();
  initializeFirebase();
  await mkdir(workRoot(), { recursive: true, mode: 0o700 });
  console.log(`[ai-image-worker] ready on ${hostname()} · GPT Image mini + Gemini Flash Image · paid calls ${paidGenerationEnabled() ? "enabled" : "disabled"}`);
  await heartbeat();
  while (!stopping) {
    const job = await claimNextJob();
    if (job) {
      console.log(`[ai-image-worker] processing job ${job.id} · ${job.provider}`);
      await processJob(job);
    } else {
      await heartbeat();
      await delay(POLL_IDLE_MS);
    }
  }
  await heartbeat("offline", "");
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

main().catch((error) => {
  console.error(`[ai-image-worker] fatal: ${cleanError(error)}`);
  process.exitCode = 1;
});
