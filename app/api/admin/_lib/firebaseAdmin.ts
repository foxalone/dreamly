import { loadServiceAccount, type FirebaseServiceAccount } from "@/lib/firebaseServiceAccount";
export { loadServiceAccount, type FirebaseServiceAccount } from "@/lib/firebaseServiceAccount";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const APP_NAME = "project-server";

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
