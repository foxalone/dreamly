import * as functions from "firebase-functions/v1";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const WELCOME_CREDITS = 10;

function emailInitials(email?: string | null) {
  const e = (email ?? "").trim();
  if (!e) return "U";
  const left = e.split("@")[0] ?? "";
  const parts = left.split(/[._\-+]/).filter(Boolean);
  const a = (parts[0]?.[0] ?? left[0] ?? "U").toUpperCase();
  const b = (parts[1]?.[0] ?? left[1] ?? "").toUpperCase();
  return (a + b) || a;
}

export const grantWelcomeCredits = functions
  .region("europe-west1")
  .auth.user()
  .onCreate(async (user) => {
    const userRef = db.doc(`users/${user.uid}`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (snap.exists) return;

      tx.set(userRef, {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        initials: emailInitials(user.email),

        credits: WELCOME_CREDITS,
        welcomeBonusGranted: true,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(userRef.collection("creditLedger").doc(), {
        type: "welcome_bonus",
        delta: WELCOME_CREDITS,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  });