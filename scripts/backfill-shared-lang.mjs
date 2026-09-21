#!/usr/bin/env node
/**
 * One-off: detect and store `lang` (ISO 639-1) on every shared_dreams doc
 * that does not have it yet, using the same tiny gpt-5-nano call the
 * /api/dreams/detect-lang route makes at share time.
 *
 *   npm run backfill-shared-lang            # dry run: counts + sample only
 *   npm run backfill-shared-lang -- --write # actually detect and write
 *
 * Cost: ~100–150 tokens per dream on gpt-5-nano — fractions of a cent per
 * thousand dreams.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";

const WRITE = process.argv.includes("--write");
const MODEL = env("OPENAI_DETECT_LANG_MODEL") || "gpt-5-nano";

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

function normalizeLangCode(v) {
  const s = String(v ?? "").trim().toLowerCase().replace(/[^a-z-]/g, "");
  const base = s.split("-")[0];
  if (!/^[a-z]{2,3}$/.test(base)) return null;
  if (base === "und" || base === "unknown" || base === "mul") return null;
  if (base === "iw") return "he";
  return base;
}

async function detect(openai, text) {
  const clean = String(text ?? "").trim();
  if (!clean) return null;
  const resp = await openai.responses.create({
    model: MODEL,
    instructions:
      "You identify the language a text is written in. Reply with only the ISO 639-1 two-letter code in lowercase (e.g. en, ru, he, ar, es). If the text mixes languages, answer with the dominant one. If it is not identifiable, reply und.",
    input: clean.slice(0, 1500),
    reasoning: { effort: "minimal" },
  });
  return normalizeLangCode(resp.output_text ?? "");
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const db = getFirestore();

  const apiKey = env("ONEIRO_OPENAI_API_KEY") || env("OPENAI_API_KEY");
  if (WRITE && !apiKey) throw new Error("Missing ONEIRO_OPENAI_API_KEY");
  const openai = apiKey ? new OpenAI({ apiKey }) : null;

  const snap = await db.collection("shared_dreams").get();
  const todo = snap.docs.filter((d) => {
    const data = d.data() ?? {};
    return !String(data.lang ?? "").trim() && String(data.text ?? "").trim();
  });

  console.log(`shared_dreams total:   ${snap.size}`);
  console.log(`missing lang (todo):   ${todo.length}`);
  console.log(`model:                 ${MODEL}`);

  if (!WRITE) {
    for (const d of todo.slice(0, 5)) {
      console.log(`  sample ${d.id}: ${String(d.data().text ?? "").slice(0, 60).replace(/\s+/g, " ")}`);
    }
    console.log("\nDry run. Re-run with --write to detect and store.");
    return;
  }

  const counts = {};
  let written = 0;
  let undetermined = 0;
  let failed = 0;

  for (const d of todo) {
    let lang = null;
    try {
      lang = await detect(openai, d.data().text);
    } catch (e) {
      failed += 1;
      console.warn(`  ! ${d.id}: ${e?.message ?? e}`);
      continue;
    }
    if (!lang) {
      undetermined += 1;
      continue;
    }
    await d.ref.update({
      lang,
      langModel: MODEL,
      langAtMs: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    written += 1;
    counts[lang] = (counts[lang] ?? 0) + 1;
    if (written % 25 === 0) console.log(`  … ${written}/${todo.length}`);
  }

  console.log(`\nwritten:       ${written}`);
  console.log(`undetermined:  ${undetermined}`);
  console.log(`failed:        ${failed}`);
  console.log(`by language:   ${JSON.stringify(counts)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
