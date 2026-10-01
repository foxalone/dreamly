// lib/firebaseAdmin.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let cachedServiceAccount: any | null = null;

function getServiceAccount() {
  if (cachedServiceAccount) return cachedServiceAccount;

  // Prefer JSON env (Vercel / admin routes), fallback to file path (local)
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    cachedServiceAccount = JSON.parse(json);
    return cachedServiceAccount;
  }

  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!p) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH"
    );
  }

  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  const raw = fs.readFileSync(abs, "utf8");
  cachedServiceAccount = JSON.parse(raw);
  return cachedServiceAccount;
}

function ensureAdmin() {
  // Only the DEFAULT app counts: app/api/admin/_lib/firebaseAdmin.ts creates a
  // named app ("project-server"), and if that one came first in the same
  // lambda, admin.firestore() below would throw "The default Firebase app
  // does not exist".
  if (admin.apps.some((a) => a?.name === "[DEFAULT]")) return;

  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
    // databaseURL нужен только если используешь Realtime Database
    ...(process.env.FIREBASE_DATABASE_URL
      ? { databaseURL: process.env.FIREBASE_DATABASE_URL }
      : {}),
  });

  // Удобно, чтобы Firestore не падал на undefined
  try {
    admin.firestore().settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings можно вызывать только один раз — игнорируем, если уже вызвали
  }
}

/** ✅ Firestore (для city_emoji_stats, users/{uid}/stats и т.д.) */
export function adminFirestore() {
  ensureAdmin();
  return admin.firestore();
}

/** (опционально) Realtime Database — оставил, если вдруг ещё нужно */
export function adminRtdb() {
  ensureAdmin();
  return admin.database();
}