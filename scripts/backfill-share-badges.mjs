#!/usr/bin/env node
/**
 * One-off: stamp the creature level (`shareBadge`, see lib/shareBadges.ts) on
 * every shared_dreams doc that was shared before levels existed, so the feed
 * shows a creature instead of initials everywhere.
 *
 * The level is the one the author had AT THAT SHARE: per owner, docs are
 * walked oldest → newest and the running count of live (not deleted) shares
 * picks the level. So one person's early dream shows 🦄 and a later one 🧙.
 * Guest docs (ownerUid null) are a single share → 🦄.
 * Docs missing `deleted` get deleted:false (the level count queries filter on it).
 *
 *   npm run backfill-share-badges            # dry run: counts + sample
 *   npm run backfill-share-badges -- --write # write
 *   add --force to also overwrite docs that already have a shareBadge
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force");

// Keep in sync with SHARE_BADGES in lib/shareBadges.ts
const LEVELS = [
  ["dreamer", 0],
  ["unicorn", 1],
  ["wizard", 2],
  ["siren", 6],
  ["phoenix", 11],
  ["dragon", 26],
  ["oneiros", 51],
];

function badgeFor(count) {
  let out = LEVELS[0][0];
  for (const [id, min] of LEVELS) if (count >= min) out = id;
  return out;
}

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

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
  const db = getFirestore();

  const snap = await db.collection("shared_dreams").get();
  const byOwner = new Map();
  for (const d of snap.docs) {
    const data = d.data() ?? {};
    const owner = String(data.ownerUid ?? "").trim() || `guest:${d.id}`;
    if (!byOwner.has(owner)) byOwner.set(owner, []);
    byOwner.get(owner).push(d);
  }

  const updates = [];
  const tally = {};
  for (const docs of byOwner.values()) {
    docs.sort((a, b) => (Number(a.data().sharedAtMs) || 0) - (Number(b.data().sharedAtMs) || 0));
    let live = 0;
    for (const d of docs) {
      const data = d.data() ?? {};
      const deleted = data.deleted === true;
      if (!deleted) live += 1;
      // a deleted share keeps the level its author had when sharing it
      const badge = badgeFor(Math.max(1, deleted ? live + 1 : live));
      const patch = {};
      if (FORCE || !data.shareBadge) patch.shareBadge = badge;
      if (data.deleted === undefined) patch.deleted = false;
      if (Object.keys(patch).length === 0) continue;
      updates.push({ ref: d.ref, id: d.id, patch });
      if (patch.shareBadge) tally[patch.shareBadge] = (tally[patch.shareBadge] ?? 0) + 1;
    }
  }

  console.log(`shared_dreams total: ${snap.size}`);
  console.log(`owners:              ${byOwner.size}`);
  console.log(`docs to update:      ${updates.length}`);
  console.log(`badges to stamp:     ${JSON.stringify(tally)}`);

  if (!WRITE) {
    for (const u of updates.slice(0, 8)) console.log(`  sample ${u.id}: ${JSON.stringify(u.patch)}`);
    console.log("\nDry run. Re-run with --write to store.");
    return;
  }

  let written = 0;
  for (let i = 0; i < updates.length; i += 400) {
    const batch = db.batch();
    for (const u of updates.slice(i, i + 400)) batch.update(u.ref, u.patch);
    await batch.commit();
    written += Math.min(400, updates.length - i);
  }
  console.log(`written: ${written}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
