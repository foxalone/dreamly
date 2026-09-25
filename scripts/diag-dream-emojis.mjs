#!/usr/bin/env node
/**
 * Inspect everywhere a dream's emojis live (journal doc, shared_dreams,
 * guest_dreams snapshot, map_ingested records, user + city counters), and
 * optionally remove stale emojis from a city's counters.
 *
 *   node scripts/diag-dream-emojis.mjs <uid> <dreamId>
 *   node scripts/diag-dream-emojis.mjs --remove-from-city <cityId> 🕶 🪷 😨 🖊
 *
 * --remove-from-city decrements each emoji by 1 in city_emoji_stats/{cityId}
 * (and in every city_emoji_daily/{cityId}_* doc that still counts it), clamped
 * at zero; zero keys are deleted. Run from the repo root (.env.local is read).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function env(name) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim()) return value.trim();
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
  const p = env("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (!p) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH");
  return JSON.parse(readFileSync(path.isAbsolute(p) ? p : path.join(process.cwd(), p), "utf8"));
}

if (!getApps().length) initializeApp({ credential: cert(serviceAccount()) });
const db = getFirestore();

const natives = (list) => (Array.isArray(list) ? list : []).map((e) => String(e?.native ?? "")).filter(Boolean);
const show = (label, snap, pick) => {
  if (!snap.exists) return console.log(`${label}: (missing)`);
  const d = snap.data() ?? {};
  console.log(`${label}:`, JSON.stringify(pick ? pick(d) : d));
};

async function inspect(uid, dreamId) {
  const itemRef = db.doc(`users/${uid}/dreams/${dreamId}`);
  const item = await itemRef.get();
  show("journal doc", item, (d) => ({ emojis: natives(d.emojis), emojisSource: d.emojisSource ?? null, cityId: d.cityId ?? null, citySource: d.citySource ?? null, shared: d.shared, deleted: d.deleted, fromHomeAsk: d.fromHomeAsk ?? null, text: String(d.text ?? "").slice(0, 60) }));
  show("shared_dreams", await db.doc(`shared_dreams/${uid}_${dreamId}`).get(), (d) => ({ emojis: natives(d.emojis), cityId: d.cityId ?? null, deleted: d.deleted }));
  const ing = await db.doc(`map_ingested/${uid}_${dreamId}`).get();
  show("map_ingested (user)", ing);
  show("users/stats/emoji", await db.doc(`users/${uid}/stats/emoji`).get(), (d) => ({ emojis: d.emojis ?? {}, totalDreams: d.totalDreams }));
  const dk = ing.data()?.dateKey;
  if (dk) show(`users/emoji_daily/${dk}`, await db.doc(`users/${uid}/emoji_daily/${dk}`).get(), (d) => ({ emojis: d.emojis ?? {}, totalDreams: d.totalDreams }));

  const linked = await db.collection("guest_dreams").where("importedUid", "==", uid).where("importedDreamId", "==", dreamId).get();
  console.log(`guest_dreams linked by importedDreamId: ${linked.size}`);
  const text = String(item.data()?.text ?? "").trim();
  const byText = text
    ? (await db.collection("guest_dreams").orderBy("createdAtMs", "desc").limit(400).get()).docs.filter((g) => String(g.data()?.text ?? "").trim() === text)
    : [];
  console.log(`guest_dreams with identical text: ${byText.length}`);
  const guestDocs = [...linked.docs, ...byText.filter((g) => !linked.docs.some((l) => l.id === g.id))];
  const cityIds = new Set([item.data()?.cityId, ing.data()?.cityId].filter(Boolean));
  for (const g of guestDocs) {
    const d = g.data();
    console.log(`  guest_dreams/${g.id}:`, JSON.stringify({ emojis: natives(d.emojis), cityId: d.cityId, imported: d.imported, importedDreamId: d.importedDreamId ?? null, createdAtMs: d.createdAtMs }));
    show(`  map_ingested/${g.id}`, await db.doc(`map_ingested/${g.id}`).get());
    if (d.cityId) cityIds.add(d.cityId);
  }
  const allEmojis = new Set([...natives(item.data()?.emojis), ...guestDocs.flatMap((g) => natives(g.data()?.emojis))]);
  for (const cityId of cityIds) {
    const c = await db.doc(`city_emoji_stats/${cityId}`).get();
    const em = c.data()?.emojis ?? {};
    console.log(`city_emoji_stats/${cityId}: totalDreams=${c.data()?.totalDreams} totalStories=${c.data()?.totalStories ?? 0}`);
    console.log("  emojis (full map):", JSON.stringify(em));
    console.log("  storyEmojis:", JSON.stringify(c.data()?.storyEmojis ?? {}));
    const daily = await db.collection("city_emoji_daily").where("cityId", "==", cityId).get();
    for (const d of daily.docs) console.log(`  ${d.ref.path}:`, JSON.stringify({ totalDreams: d.data()?.totalDreams, emojis: d.data()?.emojis ?? {} }));
  }
}

async function removeFromCity(cityId, emojis) {
  const statsRef = db.doc(`city_emoji_stats/${cityId}`);
  const daily = await db.collection("city_emoji_daily").where("cityId", "==", cityId).get();
  const refs = [statsRef, ...daily.docs.map((d) => d.ref)];
  for (const ref of refs) {
    const snap = await ref.get();
    if (!snap.exists) continue;
    const cur = snap.data()?.emojis ?? {};
    const patch = {};
    for (const e of emojis) {
      const n = Number(cur[e] ?? 0);
      if (!(n > 0)) continue;
      patch[e] = n - 1 > 0 ? n - 1 : FieldValue.delete();
    }
    if (!Object.keys(patch).length) continue;
    await ref.set({ emojis: patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log(`updated ${ref.path}:`, JSON.stringify(Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, typeof v === "number" ? v : 0]))));
  }
}

const args = process.argv.slice(2);
if (args[0] === "--remove-from-city") {
  const [, cityId, ...emojis] = args;
  if (!cityId || !emojis.length) throw new Error("usage: --remove-from-city <cityId> <emoji...>");
  await removeFromCity(cityId, emojis);
} else {
  const [uid, dreamId] = args;
  if (!uid || !dreamId) throw new Error("usage: <uid> <dreamId>");
  await inspect(uid, dreamId);
}
