import { existsSync, readFileSync } from "fs";
import path from "path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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

export function ensureAdmin() {
  if (getApps().length) return;

  const json = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const parsed = parseJson(json) ?? readServiceAccountFromEnvFile();
  if (!parsed) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }

  initializeApp({ credential: cert(parsed) });
}

export function adminAuth() {
  ensureAdmin();
  return getAuth();
}

export function adminDb() {
  ensureAdmin();
  return getFirestore();
}

export function seedUid() {
  return mustEnv("DREAMLY_SEED_UID").trim();
}