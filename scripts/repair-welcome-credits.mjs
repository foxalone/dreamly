#!/usr/bin/env node
/**
 * Repairs users whose welcome bonus was wiped by the old client-side
 * `credits: 0` write (see app/app/dreams/page.tsx credits listener).
 *
 * Broken signature: welcomeBonusGranted === true, a creditLedger/welcome_bonus
 * entry exists, but the `credits` field is missing from the user document.
 * Those users can never earn the bonus back — grantWelcomeCredits only runs
 * once, on account creation.
 *
 * A user sitting at credits: 0 is NOT touched: nothing distinguishes "wiped"
 * from "spent it all", and handing out free credits on a guess is worse than
 * leaving it alone.
 *
 *   npm run repair-welcome-credits          # dry run, prints what it would do
 *   npm run repair-welcome-credits -- --write
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const WELCOME_CREDITS = 10;
const WRITE = process.argv.includes("--write");

function env(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function serviceAccount() {
  const inline = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) return JSON.parse(inline);

  const configuredPath = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!configuredPath) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  }
  const absolute = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
  return JSON.parse(readFileSync(absolute, "utf8"));
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const db = getFirestore();

  const snap = await db.collection("users").get();
  const broken = [];
  let missingBonusFlag = 0;
  let zeroCredits = 0;

  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    if (data.credits === undefined) {
      if (data.welcomeBonusGranted === true) {
        const ledger = await doc.ref.collection("creditLedger").doc("welcome_bonus").get();
        broken.push({ id: doc.id, email: data.email ?? null, ledger: ledger.exists });
      } else {
        missingBonusFlag += 1;
      }
    } else if (Number(data.credits) === 0) {
      zeroCredits += 1;
    }
  }

  console.log(`users scanned:            ${snap.size}`);
  console.log(`credits field missing:    ${broken.length + missingBonusFlag}`);
  console.log(`  └ bonus already marked: ${broken.length}  ← repairable`);
  console.log(`credits === 0:            ${zeroCredits} (left alone on purpose)`);

  if (!broken.length) {
    console.log("\nNothing to repair.");
    return;
  }

  for (const user of broken) {
    console.log(`  ${user.id}  ${user.email ?? "(no email)"}  ledger=${user.ledger}`);
  }

  if (!WRITE) {
    console.log(`\nDry run. Re-run with --write to grant ${WELCOME_CREDITS} credits to the users above.`);
    return;
  }

  let repaired = 0;
  for (const user of broken) {
    const ref = db.collection("users").doc(user.id);
    const didWrite = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      // Re-check inside the transaction: never overwrite a real balance.
      if (!fresh.exists || fresh.data()?.credits !== undefined) return false;
      tx.set(
        ref,
        {
          credits: WELCOME_CREDITS,
          creditsUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(
        ref.collection("creditLedger").doc("welcome_bonus_repair"),
        {
          type: "welcome_bonus_repair",
          delta: WELCOME_CREDITS,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    });
    if (didWrite) repaired += 1;
  }

  console.log(`\nRepaired ${repaired} user(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
