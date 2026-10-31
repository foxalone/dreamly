#!/usr/bin/env node
/**
 * Recover failed guest dream analyses after an AI provider 429.
 *
 * Dry run: node --env-file=.env.local --import tsx scripts/recover-rate-limited-dreams.mjs
 * Apply:   node --env-file=.env.local --import tsx scripts/recover-rate-limited-dreams.mjs --write
 *
 * This admin repair does not consume the guest's refunded ad credit. Feed
 * publishing remains with the visitor's saved browser choice on return.
 */
import admin from "firebase-admin";
import OpenAI from "openai";
import { adminFirestore } from "../lib/firebaseAdmin.ts";
import { getOneiroOpenAiApiKey } from "../lib/openaiEnv.ts";
import { generateDreamAnalysis } from "../lib/dreamAnalysisProvider.ts";
import { dreamAnalysisMessages } from "../lib/dreamAnalysisPrompt.ts";
import { parseDreamLens } from "../lib/dream-lenses.ts";
import { pickDreamMapVisuals } from "../lib/dream-map/pickDreamMapVisuals.ts";
import { guestDreamSnapshotId } from "../app/api/dreams/_lib/guestDreamSnapshot.ts";
import { appendAttemptEvent } from "../lib/analysisAttempts.ts";

const WRITE = process.argv.includes("--write");
const BATCH = "2026-10-28-provider-rate-limit";
const db = adminFirestore();

async function candidates() {
  const [failed, recovered] = await Promise.all([
    db.collection("analysis_attempts").where("reason", "==", "ai_rate_limited").get(),
    db.collection("analysis_attempts").where("recoveryBatch", "==", BATCH).get(),
  ]);
  const docs = new Map([...failed.docs, ...recovered.docs].map(doc => [doc.id, doc]));
  return [...docs.values()]
    .filter(doc => doc.data().guestId && (doc.data().status === "failed" || doc.data().recoveryBatch === BATCH))
    .sort((a, b) => Number(a.data().createdAtMs) - Number(b.data().createdAtMs));
}

async function cityCoordinates(row) {
  if (!row.cityId || !row.city || !row.country) return null;
  const existing = await db.collection("cities").doc(row.cityId).get();
  if (typeof existing.data()?.lat === "number" && typeof existing.data()?.lng === "number") {
    return { lat: existing.data().lat, lng: existing.data().lng };
  }
  const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const query = [row.city, row.country].join(", ");
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&limit=1&types=place&language=en`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) return null;
  const result = await response.json();
  const center = result?.features?.[0]?.center;
  if (!Array.isArray(center) || !Number.isFinite(center[0]) || !Number.isFinite(center[1])) return null;
  return { lat: center[1], lng: center[0] };
}

async function recoverAnalysis(doc, openai) {
  const row = doc.data();
  if (row.status === "succeeded") {
    if (row.recoveryBatch === BATCH && row.httpStatus !== 200) {
      await doc.ref.update({ recoveredFromHttpStatus: row.httpStatus ?? null,
        httpStatus: 200, durationMs: null });
    }
    return "already_ready";
  }
  const result = await generateDreamAnalysis(async (model) => {
    const response = await openai.chat.completions.create({
      model, reasoning_effort: "minimal",
      messages: dreamAnalysisMessages(row.text, row.lang, parseDreamLens(row.lens)),
    });
    return String(response.choices?.[0]?.message?.content ?? "").trim();
  });
  if (!result.analysis) throw new Error("empty analysis");
  const visuals = await pickDreamMapVisuals(row.text).catch(() => null);
  const emojis = visuals?.emojis?.length ? visuals.emojis : [{ native: "💭" }];
  const now = Date.now();
  const snapshotRef = db.collection("guest_dreams").doc(guestDreamSnapshotId(row.guestId, row.text));
  const changed = await db.runTransaction(async tx => {
    const [latest, snapshot] = await Promise.all([tx.get(doc.ref), tx.get(snapshotRef)]);
    if (latest.data()?.status !== "failed" || latest.data()?.reason !== "ai_rate_limited") return false;
    if (snapshot.data()?.deleted === true) return false;
    tx.set(snapshotRef, {
      guestId: row.guestId, sourceType: "guest", text: row.text.trim(),
      analysis: result.analysis, analysisModel: result.model, lens: row.lens,
      lang: row.lang, emojis, iconsEn: visuals?.iconsEn ?? [], rootsEn: visuals?.rootsEn ?? [],
      analysisAtMs: now, recoveredFrom: "ai_rate_limited", recoveredAtMs: now,
      cityId: row.cityId || null, city: row.city || null,
      country: row.country || null, admin1: row.admin1 || null, citySource: row.cityId ? "ip" : null,
      ...(!snapshot.exists ? {
        createdAtMs: row.createdAtMs, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        dateKey: new Date(row.createdAtMs).toISOString().slice(0, 10),
        shared: false, deleted: false, imported: false,
      } : {}),
    }, { merge: true });
    tx.update(doc.ref, {
      status: "succeeded", reason: "succeeded", analysis: result.analysis,
      model: result.model, emojiModel: null, emojis,
      recoveredFromHttpStatus: latest.data()?.httpStatus ?? null,
      httpStatus: 200, durationMs: null,
      recoveryBatch: BATCH, recoveredAtMs: now, updatedAtMs: now,
      events: appendAttemptEvent(latest.data(), "analysis_ready", "server", now),
    });
    return true;
  });
  return changed ? "recovered" : "skipped_changed";
}

async function recoverMap(doc) {
  const row = (await doc.ref.get()).data();
  if (row.status !== "succeeded" || row.recoveryBatch !== BATCH) return "not_ready";
  if (!row.cityId || !row.city || !row.country) return "no_city";
  const dateKey = new Date(row.createdAtMs).toISOString().slice(0, 10);
  const ingestId = `guest_${row.guestId}_${dateKey}`;
  const ingestRef = db.collection("map_ingested").doc(ingestId);
  if ((await ingestRef.get()).exists) return "already_pinned_for_day";
  const coordinates = await cityCoordinates(row);
  if (!coordinates) return "no_coordinates";
  const emojis = Array.isArray(row.emojis) ? row.emojis.filter(item => item?.native) : [];
  if (!emojis.length) return "no_emojis";
  const snapshotRef = db.collection("guest_dreams").doc(guestDreamSnapshotId(row.guestId, row.text));
  const cityRef = db.collection("cities").doc(row.cityId);
  const statsRef = db.collection("city_emoji_stats").doc(row.cityId);
  const dailyRef = db.collection("city_emoji_daily").doc(`${row.cityId}_${dateKey}`);
  const done = await db.runTransaction(async tx => {
    const [marker, snapshot] = await Promise.all([tx.get(ingestRef), tx.get(snapshotRef)]);
    if (marker.exists || !snapshot.exists || snapshot.data()?.deleted === true) return false;
    tx.set(cityRef, { cityId: row.cityId, city: row.city, country: row.country,
      admin1: row.admin1 || null, ...coordinates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    tx.set(statsRef, { cityId: row.cityId, city: row.city, country: row.country,
      admin1: row.admin1 || null, ...coordinates,
      totalDreams: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    tx.set(dailyRef, { cityId: row.cityId, dateKey,
      totalDreams: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    for (const emoji of emojis) {
      tx.set(statsRef, { [`emojis.${emoji.native}`]: admin.firestore.FieldValue.increment(1) }, { merge: true });
      tx.set(dailyRef, { [`emojis.${emoji.native}`]: admin.firestore.FieldValue.increment(1) }, { merge: true });
    }
    tx.set(ingestRef, { uid: null, guestId: row.guestId, dreamId: null,
      guestDreamId: snapshotRef.id, sourceType: "dream", cityId: row.cityId,
      dateKey, createdAtMs: row.createdAtMs,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), emojisCount: emojis.length });
    tx.set(snapshotRef, { mapIngestId: ingestId, dateKey,
      cityId: row.cityId, city: row.city, country: row.country,
      admin1: row.admin1 || null, citySource: "ip" }, { merge: true });
    return true;
  });
  return done ? "pinned" : "already_pinned_for_day";
}

async function main() {
  const rows = await candidates();
  console.log(JSON.stringify({ mode: WRITE ? "write" : "dry_run", candidates: rows.length }));
  if (!WRITE) {
    for (const doc of rows) {
      const row = doc.data();
      console.log(JSON.stringify({ id: doc.id, status: row.status, date: new Date(row.createdAtMs).toISOString().slice(0, 10), cityId: row.cityId || null }));
    }
    return;
  }
  const apiKey = getOneiroOpenAiApiKey();
  if (!apiKey) throw new Error("Missing OpenAI API key");
  const openai = new OpenAI({ apiKey, maxRetries: 0, timeout: 30_000 });
  for (const doc of rows) {
    try {
      const analysis = await recoverAnalysis(doc, openai);
      const map = await recoverMap(doc);
      console.log(JSON.stringify({ id: doc.id, analysis, map }));
    } catch (error) {
      console.error(JSON.stringify({ id: doc.id, errorCode: error?.code ?? null, status: error?.status ?? null,
        message: error instanceof Error && !error.status ? error.message : "provider_failure" }));
    }
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "recovery failed"); process.exitCode = 1; });
