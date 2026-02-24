// lib/firebaseAdmin.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let cachedServiceAccount: any | null = null;

function getServiceAccount() {
  if (cachedServiceAccount) return cachedServiceAccount;

  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!p) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_PATH");

  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  const raw = fs.readFileSync(abs, "utf8");
  cachedServiceAccount = JSON.parse(raw);
  return cachedServiceAccount;
}

function ensureAdmin() {
  if (admin.apps.length) return;

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