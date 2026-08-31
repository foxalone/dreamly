import { existsSync, readFileSync } from "fs";
import path from "path";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Next.js loads only the first line of unquoted multiline .env.local values. */
function readServiceAccountFromEnvFile() {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return null;
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/^FIREBASE_SERVICE_ACCOUNT_JSON=/m);
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
    else if (character === "}" && --depth === 0) {
      return parseJson(candidate.slice(0, index + 1));
    }
  }
  return null;
}

export type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

const APP_NAME = "project-server";

export function loadServiceAccount(): FirebaseServiceAccount {
  const json = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const parsed = parseJson(json) ?? readServiceAccountFromEnvFile();
  if (!parsed || typeof parsed !== "object") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  return parsed as FirebaseServiceAccount;
}

export function tryLoadServiceAccount(): FirebaseServiceAccount | null {
  try {
    return loadServiceAccount();
  } catch {
    return null;
  }
}

export function ensureAdmin(): App {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;
  const account = loadServiceAccount();
  const projectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || account.project_id || "").trim();
  const databaseURL = (
    process.env.FIREBASE_ADMIN_DATABASE_URL ||
    process.env.FIREBASE_DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    ""
  ).trim();
  const storageBucket = (
    process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    ""
  ).trim();
  if (!projectId) throw new Error("Missing Firebase Admin project id");
  if (!databaseURL) throw new Error("Missing Firebase Admin database URL");
  if (!storageBucket) throw new Error("Missing Firebase Admin storage bucket");
  return initializeApp({
    credential: cert({
      projectId,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
    projectId,
    databaseURL,
    storageBucket,
  }, APP_NAME);
}

export function adminAuth() {
  return getAuth(ensureAdmin());
}

export function adminDb() {
  return getFirestore(ensureAdmin());
}

export function adminRtdb() {
  return getDatabase(ensureAdmin());
}

export function seedUid() {
  return mustEnv("DREAMLY_SEED_UID").trim();
}
