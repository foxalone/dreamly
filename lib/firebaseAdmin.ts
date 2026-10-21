// lib/firebaseAdmin.ts
import admin from "firebase-admin";
import { loadServiceAccount, type FirebaseServiceAccount } from "./firebaseServiceAccount";

let cachedServiceAccount: FirebaseServiceAccount | null = null;

function getServiceAccount() {
  cachedServiceAccount ??= loadServiceAccount();
  return cachedServiceAccount;
}

function ensureAdmin() {
  // Only the DEFAULT app counts: app/api/admin/_lib/firebaseAdmin.ts creates a
  // named app ("project-server"), and if that one came first in the same
  // lambda, admin.firestore() below would throw "The default Firebase app
  // does not exist".
  if (admin.apps.some((a) => a?.name === "[DEFAULT]")) return;

  const account = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
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