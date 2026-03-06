import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function ensureAdmin() {
  if (getApps().length) return;

  const json = mustEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  let parsed: any = null;

  try {
    parsed = JSON.parse(json);
  } catch {
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