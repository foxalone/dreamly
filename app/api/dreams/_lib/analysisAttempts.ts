import { createHash } from "node:crypto";
import type { DocumentData, Firestore, Transaction } from "firebase-admin/firestore";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { attemptEventDetails, appendAttemptEvent, analysisAttemptContext, analysisAttemptResult } from "@/lib/analysisAttempts";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { attemptOutcome, clientAttemptUpdate, ownsAnalysisAttempt, type AttemptEvent } from "@/lib/analysisAttempts";
import { guestDreamSnapshotId } from "./guestDreamSnapshot";

type AnalysisIdentity = { text: string; lang: string; lens: string; attemptId?: string };

function dailyAnalysisAttemptId(owner: string, input: AnalysisIdentity, now: number) {
  return createHash("sha256").update(JSON.stringify([owner, input.text, input.lang, input.lens, new Date(now).toISOString().slice(0, 10)])).digest("hex");
}

/** Older snapshots did not record how the interpretation was unlocked. */
export async function guestSnapshotUsedReward(
  db: Firestore, tx: Transaction, guestId: string, snapshot: DocumentData,
): Promise<boolean> {
  if (typeof snapshot.rewarded === "boolean") return snapshot.rewarded;
  const { text, lang, lens, analysis, analysisAtMs } = snapshot;
  if (typeof text !== "string" || typeof lang !== "string" || typeof lens !== "string" ||
      typeof analysisAtMs !== "number" || !Number.isFinite(analysisAtMs)) return false;

  // An analysis started before midnight can be stored on the next UTC day.
  const attempts = await Promise.all([analysisAtMs, analysisAtMs - 86_400_000].map((time) => {
    const id = dailyAnalysisAttemptId(`g:${guestId}`, { text, lang, lens }, time);
    return tx.get(db.collection("analysis_attempts").doc(id));
  }));
  return attempts.some((attempt) => {
    const row = attempt.data();
    if (row?.guestId !== guestId || row.uid || row.status !== "succeeded" ||
        row.text !== text || row.lang !== lang || row.lens !== lens || row.analysis !== analysis ||
        typeof row.startedAtMs !== "number" || row.startedAtMs > analysisAtMs || !Array.isArray(row.events)) return false;
    return row.events.some((event) => event?.source === "server" && event.event === "ad_credit_used" &&
      typeof event.atMs === "number" && event.atMs >= row.startedAtMs && event.atMs <= analysisAtMs);
  });
}

/** Read a previously prepared guest answer before another request can clear it or consume access. */
export async function recoverUndeliveredGuestAnalysis(input: AnalysisIdentity & { guestId: string }) {
  const db = adminFirestore();
  const id = typeof input.attemptId === "string" && /^[a-f0-9]{64}$/.test(input.attemptId)
    ? input.attemptId : dailyAnalysisAttemptId(`g:${input.guestId}`, input, Date.now());
  const ref = db.collection("analysis_attempts").doc(id);
  return db.runTransaction(async (tx) => {
    const row = (await tx.get(ref)).data();
    if (!row || row.uid || row.guestId !== input.guestId || row.text !== input.text ||
        row.lang !== input.lang || row.lens !== input.lens || row.displayedAtMs ||
        !["succeeded", "waiting", "incomplete"].includes(row.status)) return null;

    const events: { event: string; source: string; atMs: number }[] = Array.isArray(row.events) ? row.events : [];
    const ready = events.findLastIndex((e) => e.source === "server" && e.event === "analysis_ready");
    if (ready < 0 || events.findLastIndex((e) => e.event === "analysis_displayed") > ready) return null;

    if (row.status === "succeeded" && typeof row.analysis === "string" && row.analysis.trim()) {
      return { id, result: row.guestResponse ?? { analysis: row.analysis, model: row.model, lens: row.lens, guest: true, cost: 0, emojis: row.emojis } };
    }

    // Older retries could erase a prepared answer from the attempt. The private
    // snapshot must match the successful request, including its execution window.
    const started = events.slice(0, ready).findLast((e) => e.source === "server" &&
      (e.event === "analysis_submitted" || e.event === "analysis_retried"));
    if (!started) return null;
    const snapshotRef = db.collection("guest_dreams").doc(guestDreamSnapshotId(input.guestId, input.text));
    const dream = (await tx.get(snapshotRef)).data();
    if (!dream || dream.deleted || dream.guestId !== input.guestId || dream.text !== input.text ||
        dream.lang !== input.lang || dream.lens !== input.lens || typeof dream.analysisAtMs !== "number" ||
        dream.analysisAtMs < started.atMs || dream.analysisAtMs > events[ready].atMs ||
        typeof dream.analysis !== "string" || !dream.analysis.trim()) return null;

    const result = { analysis: dream.analysis, model: dream.analysisModel ?? null, lens: row.lens,
      guest: true, cost: 0, emojis: dream.emojis ?? [] };
    tx.update(ref, { ...attemptOutcome(200), ...analysisAttemptResult(result), guestResponse: result,
      httpStatus: 200, clientReported: false, updatedAtMs: Date.now() });
    return { id, result };
  });
}

export async function startAnalysisAttempt(input: AnalysisIdentity & { uid: string | null; guestId: string | null; source?: string; dreamId?: string }, req: Request): Promise<string | null> {
  try {
    const now = Date.now();
    // Best-effort, bounded lookup; never persist the raw IP returned by the resolver.
    const geo = await resolveIpCity(req, 1500).catch(() => null);
    const context = analysisAttemptContext(input, req.headers, geo);
    const owner = input.guestId ? `g:${input.guestId}` : `u:${input.uid}`;
    let id = dailyAnalysisAttemptId(owner, input, now);
    const db = adminFirestore();
    if (input.attemptId && /^[a-f0-9]{64}$/.test(input.attemptId)) {
      const candidate = (await db.collection("analysis_attempts").doc(input.attemptId).get()).data();
      if (candidate && ownsAnalysisAttempt(candidate, input.uid, input.guestId) && candidate.text === input.text && candidate.lang === input.lang && candidate.lens === input.lens) id = input.attemptId;
    }
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async (tx) => {
      const before = (await tx.get(ref)).data();
      tx.set(ref, { text: input.text, uid: input.uid, guestId: input.guestId, lang: input.lang, lens: input.lens, ...context, ...analysisAttemptResult({}), guestResponse: null, yourfitPromo: false, yourfitEligible: false, yourfitImpressionAtMs: null, displayedAtMs: null, events: appendAttemptEvent(before ?? {}, before ? "analysis_retried" : "analysis_submitted", "server", now), httpStatus: null, durationMs: null, lastEvent: null, startedAtMs: now, status: "processing", reason: "processing", clientReported: false, createdAtMs: before?.createdAtMs ?? now, updatedAtMs: now, requestCount: (Number(before?.requestCount) || 0) + 1 }, { merge: true });
    });
    return id;
  } catch (error) { console.warn("Analysis attempt logging failed", error); return null; }
}

export async function finishAnalysisAttempt(id: string | null, status: number, code?: string, result: Record<string, unknown> = {}, startedAtMs = Date.now()) {
  if (!id) return;
  try {
    const db = adminFirestore();
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async (tx) => {
      const row = (await tx.get(ref)).data();
      if (!row) return;
      const outcome = attemptOutcome(status, code, result.reason);
      const now = Date.now();
      const yourfitPromo = outcome.status === "succeeded" && result.yourfitPromo === true;
      let events = appendAttemptEvent(row, outcome.status === "succeeded" ? "analysis_ready" : outcome.reason, "server", now, { httpStatus: status });
      if (yourfitPromo) events = appendAttemptEvent({ events }, "yourfit_analysis_ready", "server", now);
      tx.update(ref, { ...outcome, ...analysisAttemptResult(result), durationMs: Math.max(0, now - startedAtMs), clientReported: false, httpStatus: status, updatedAtMs: now,
        yourfitPromo,
        ...(outcome.status === "succeeded" && result.guest === true ? { guestResponse: result } : {}),
        events });
    });
  } catch (error) { console.warn("Analysis attempt result logging failed", error); }
}

export async function reportAttemptEvent(id: string, uid: string | null, guestId: string | null, event: AttemptEvent, details?: unknown) {
  const db = adminFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("analysis_attempts").doc(id);
    const row = (await tx.get(ref)).data();
    if (!row || !ownsAnalysisAttempt(row, uid, guestId)) return false;
    if (event === "yourfit_promo_impression" || event === "yourfit_promo_click") {
      if (row.yourfitEligible !== true && row.yourfitPromo !== true) return false;
      if (event === "yourfit_promo_impression" && row.yourfitImpressionAtMs) return true;
    }
    const update = clientAttemptUpdate(row, event);
    const now = Date.now();
    if (event === "analysis_displayed" && (row.status !== "succeeded" || row.displayedAtMs)) return true;
    tx.update(ref, { ...update, events: appendAttemptEvent(row, event, "browser", now, attemptEventDetails(details)),
      ...(event === "analysis_displayed" ? { displayedAtMs: now, guestResponse: null } : {}),
      ...(event === "yourfit_promo_impression" ? { yourfitImpressionAtMs: now } : {}),
      ...(update ? { clientReported: true } : {}), updatedAtMs: now });
    return true;
  });
}

/** Server evidence of granted/rejected access or a consumed quota slot, with ownership checked. */
export async function recordAttemptAccess(id: unknown, uid: string | null, guestId: string | null, event: "ad_access_granted" | "guest_free_access" | "ad_credit_used" | "ad_grant_rejected" = "ad_access_granted", details?: unknown) {
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) return;
  try {
    const db = adminFirestore();
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async (tx) => {
      const row = (await tx.get(ref)).data();
      if (!row || !ownsAnalysisAttempt(row, uid, guestId)) return;
      const now = Date.now();
      tx.update(ref, { events: appendAttemptEvent(row, event, "server", now, attemptEventDetails(details)), updatedAtMs: now });
    });
  } catch (error) { console.warn("Analysis access logging failed", error); }
}


/** Eligibility is not a grant: it only permits recording the pre-result promotion. */
export async function markYourfitAttemptEligible(id: unknown, uid: string | null, guestId: string | null) {
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) return;
  try {
    const db = adminFirestore();
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async tx => {
      const row = (await tx.get(ref)).data();
      if (row && ownsAnalysisAttempt(row, uid, guestId)) tx.update(ref, { yourfitEligible: true });
    });
  } catch (error) { console.warn("YourFit eligibility logging failed", error); }
}
