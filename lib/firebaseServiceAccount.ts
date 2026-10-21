import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Next.js loads only the first line of unquoted multiline .env.local values. */
function readServiceAccountFromEnvFile(cwd: string) {
  const filePath = path.join(cwd, ".env.local");
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

/** Shared by the default app and the admin dashboard's named app. */
export function loadServiceAccount(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): FirebaseServiceAccount {
  const json = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  let parsed: unknown;
  if (json) {
    // Next.js truncates unquoted multiline JSON to its first line (usually "{").
    parsed = parseJson(json) ?? readServiceAccountFromEnvFile(cwd);
  } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()) {
    const filePath = path.resolve(cwd, env.FIREBASE_SERVICE_ACCOUNT_PATH.trim());
    parsed = parseJson(readFileSync(filePath, "utf8"));
  } else {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    // Do not include credential contents in errors or logs.
    throw new Error("Firebase service account must be a valid JSON object");
  }
  return parsed as FirebaseServiceAccount;
}
