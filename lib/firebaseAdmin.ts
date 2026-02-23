import admin from "firebase-admin";
import fs from "fs";
import path from "path";

function serviceAccount() {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!p) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_PATH");

  const abs = path.join(process.cwd(), p);
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw);
}

export function adminDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount()),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
  return admin.database();
}