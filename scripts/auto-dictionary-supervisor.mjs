#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = "/Users/dimab/Documents/oneiro-web";
const WAKE_DOCUMENT = "adminSystem/workerWake";
const WAKE_FRESH_MS = 30 * 60 * 1000;
const POLL_MS = 5_000;
const WORKERS = [
  { name: "video-worker", script: "scripts/video-worker.mjs" },
  { name: "ai-image-worker", script: "scripts/ai-image-worker.mjs" },
];

function env(name) {
  return (process.env[name] ?? "").trim();
}

function jsonFromEnvFile(name) {
  const filePath = path.join(ROOT, ".env.local");
  if (!existsSync(filePath)) return null;
  const source = readFileSync(filePath, "utf8");
  const match = source.match(new RegExp(`^${name}=`, "m"));
  if (!match || match.index == null) return null;
  const candidate = source.slice(match.index + match[0].length).trimStart();
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
    try {
      return JSON.parse(json);
    } catch {
      const parsed = jsonFromEnvFile("FIREBASE_SERVICE_ACCOUNT_JSON");
      if (parsed) return parsed;
    }
  }
  const configuredPath = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!configuredPath) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  const absolutePath = path.isAbsolute(configuredPath) ? configuredPath : path.join(ROOT, configuredPath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

function initializeFirebase() {
  const account = serviceAccount();
  if (!getApps().length) {
    initializeApp({
      credential: cert(account),
      projectId: env("FIREBASE_ADMIN_PROJECT_ID") || account.project_id,
    });
  }
  return getFirestore();
}

function isWorkerRunning(script) {
  const result = spawnSync("pgrep", ["-f", script], { encoding: "utf8" });
  return result.status === 0 && Boolean(result.stdout.trim());
}

function startWorker(name) {
  const npmBin = "/Users/dimab/.nvm/versions/node/v20.19.6/bin/npm";
  const child = spawn(npmBin, ["run", name], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  console.log(`[supervisor] started ${name} pid ${child.pid}`);
}

async function tick(db) {
  const snapshot = await db.doc(WAKE_DOCUMENT).get();
  const requestedAt = snapshot.get("requestedAt")?.toMillis?.() ?? Date.parse(String(snapshot.get("requestedAt") || ""));
  if (!Number.isFinite(requestedAt) || Date.now() - requestedAt > WAKE_FRESH_MS) return;
  for (const worker of WORKERS) {
    if (isWorkerRunning(worker.script)) continue;
    startWorker(worker.name);
  }
}

async function main() {
  process.chdir(ROOT);
  const db = initializeFirebase();
  console.log("[supervisor] watching adminSystem/workerWake");
  for (;;) {
    try {
      await tick(db);
    } catch (error) {
      console.error("[supervisor]", error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
