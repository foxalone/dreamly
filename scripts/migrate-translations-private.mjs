#!/usr/bin/env node
/**
 * One-off: move legacy translation text off the public shared_dreams docs.
 *
 * Before 2026-09-21 the translated text sat on shared_dreams/{id}.translations.{lang}
 * (publicly readable — anyone could read a paid translation for free). It now
 * lives in shared_dreams/{id}/private/translations (admin-only), see
 * app/api/dreams/_lib/translationLedger.ts. This script moves every remaining
 * legacy entry, sets translatedLangs on the public doc and deletes the field.
 * Entries already present in the private doc are not overwritten.
 *
 *   npm run migrate-translations-private            # dry run
 *   npm run migrate-translations-private -- --write # move
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

function env(name) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  // node --env-file (esp. Node 24) can swallow the lines that follow the
  // multi-line FIREBASE_SERVICE_ACCOUNT_JSON block; fall back to the raw file.
  try {
    const src = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const m = src.match(new RegExp(`^${name}=(.*)$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

function serviceAccount() {
  const inline = env("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      // Multi-line JSON in .env.local: --env-file only yields the first line.
      // Re-read the raw file and cut out the balanced {...} block (same as
      // scripts/paypal-setup.mjs).
      const src = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
      const m = src.match(/^FIREBASE_SERVICE_ACCOUNT_JSON=/m);
      if (m) {
        const rest = src.slice(m.index + m[0].length).trimStart();
        let depth = 0, inStr = false, esc = false;
        for (let i = 0; i < rest.length; i++) {
          const c = rest[i];
          if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
          if (c === '"') inStr = true; else if (c === "{") depth++; else if (c === "}" && --depth === 0) return JSON.parse(rest.slice(0, i + 1));
        }
      }
    }
  }

  const configuredPath = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!configuredPath) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  }
  const absolute = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
  return JSON.parse(readFileSync(absolute, "utf8"));
}


function entryFromRaw(raw) {
  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? { text, model: null, atMs: null } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const text = String(raw.text ?? "").trim();
  if (!text) return null;
  return {
    ...raw,
    text,
    model: typeof raw.model === "string" ? raw.model : null,
    atMs: typeof raw.atMs === "number" ? raw.atMs : null,
  };
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const db = getFirestore();

  const snap = await db.collection("shared_dreams").get();
  const todo = snap.docs.filter((d) => {
    const t = d.data()?.translations;
    return t && typeof t === "object" && Object.keys(t).length > 0;
  });

  console.log(`shared_dreams total:            ${snap.size}`);
  console.log(`with legacy translations field: ${todo.length}`);

  if (!WRITE) {
    for (const d of todo.slice(0, 10)) {
      console.log(`  ${d.id}: ${Object.keys(d.data().translations).join(", ")}`);
    }
    console.log("\nDry run. Re-run with --write to move.");
    return;
  }

  let moved = 0;
  let skippedLangs = 0;
  for (const d of todo) {
    const legacy = d.data().translations ?? {};
    const privRef = d.ref.collection("private").doc("translations");
    const privSnap = await privRef.get();
    const priv = privSnap.exists ? privSnap.data() ?? {} : {};

    const toWrite = {};
    const langs = [];
    for (const [lang, raw] of Object.entries(legacy)) {
      const entry = entryFromRaw(raw);
      if (!entry) continue;
      langs.push(lang);
      if (priv[lang]) {
        skippedLangs += 1; // private copy already exists (moved by a paid serve)
        continue;
      }
      toWrite[lang] = { ...entry, aiCalls: 1, cacheHits: 0, unlockCount: 0, byUid: null, byName: null, byEmail: null };
    }

    const batch = db.batch();
    if (Object.keys(toWrite).length) batch.set(privRef, { ...toWrite, updatedAtMs: Date.now() }, { merge: true });
    batch.update(d.ref, {
      translations: FieldValue.delete(),
      ...(langs.length ? { translatedLangs: FieldValue.arrayUnion(...langs) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    moved += 1;
    console.log(`  moved ${d.id}: ${langs.join(", ")}`);
  }

  console.log(`\ndocs updated: ${moved}, langs already private (kept): ${skippedLangs}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
