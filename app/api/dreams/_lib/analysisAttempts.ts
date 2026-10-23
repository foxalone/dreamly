import { createHash } from "node:crypto";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { appendAttemptEvent, analysisAttemptContext, analysisAttemptResult } from "@/lib/analysisAttempts";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { attemptOutcome, clientAttemptUpdate, ownsAnalysisAttempt, type AttemptEvent } from "@/lib/analysisAttempts";

export async function startAnalysisAttempt(input: { text: string; uid: string | null; guestId: string | null; lang: string; lens: string; source?: string; dreamId?: string; attemptId?: string }, req: Request): Promise<string | null> {
  try {
    const now = Date.now();
    // Best-effort, bounded lookup; never persist the raw IP returned by the resolver.
    const geo = await resolveIpCity(req, 1500).catch(() => null);
    const context = analysisAttemptContext(input, req.headers, geo);
    const owner = input.guestId ? `g:${input.guestId}` : `u:${input.uid}`;
    let id = createHash("sha256").update(JSON.stringify([owner, input.text, input.lang, input.lens, new Date(now).toISOString().slice(0, 10)])).digest("hex");
    const db = adminFirestore();
    if (input.attemptId && /^[a-f0-9]{64}$/.test(input.attemptId)) {
      const candidate = (await db.collection("analysis_attempts").doc(input.attemptId).get()).data();
      if (candidate && ownsAnalysisAttempt(candidate, input.uid, input.guestId) && candidate.text === input.text && candidate.lang === input.lang && candidate.lens === input.lens) id = input.attemptId;
    }
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async (tx) => {
      const before = (await tx.get(ref)).data();
      tx.set(ref, { text: input.text, uid: input.uid, guestId: input.guestId, lang: input.lang, lens: input.lens, ...context, ...analysisAttemptResult({}), displayedAtMs: null, events: appendAttemptEvent(before ?? {}, before ? "analysis_retried" : "analysis_submitted", "server", now), httpStatus: null, durationMs: null, lastEvent: null, startedAtMs: now, status: "processing", reason: "processing", clientReported: false, createdAtMs: before?.createdAtMs ?? now, updatedAtMs: now, requestCount: (Number(before?.requestCount) || 0) + 1 }, { merge: true });
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
      const outcome = attemptOutcome(status, code);
      const now = Date.now();
      tx.update(ref, { ...outcome, ...analysisAttemptResult(result), durationMs: Math.max(0, now - startedAtMs), clientReported: false, httpStatus: status, updatedAtMs: now,
        events: appendAttemptEvent(row, outcome.status === "succeeded" ? "analysis_ready" : outcome.reason, "server", now, { httpStatus: status }) });
    });
  } catch (error) { console.warn("Analysis attempt result logging failed", error); }
}

export async function reportAttemptEvent(id: string, uid: string | null, guestId: string | null, event: AttemptEvent) {
  const db = adminFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("analysis_attempts").doc(id);
    const row = (await tx.get(ref)).data();
    if (!row || !ownsAnalysisAttempt(row, uid, guestId)) return false;
    const update = clientAttemptUpdate(row, event);
    const now = Date.now();
    if (event === "analysis_displayed" && (row.status !== "succeeded" || row.displayedAtMs)) return true;
    tx.update(ref, { ...update, events: appendAttemptEvent(row, event, "browser", now),
      ...(event === "analysis_displayed" ? { displayedAtMs: now } : {}),
      ...(update ? { clientReported: true } : {}), updatedAtMs: now });
    return true;
  });
}

/** Server evidence of granted access or a consumed quota slot, with ownership checked. */
export async function recordAttemptAccess(id: unknown, uid: string | null, guestId: string | null, event: "ad_access_granted" | "guest_free_access" | "ad_credit_used" = "ad_access_granted") {
  if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) return;
  try {
    const db = adminFirestore();
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async (tx) => {
      const row = (await tx.get(ref)).data();
      if (!row || !ownsAnalysisAttempt(row, uid, guestId)) return;
      const now = Date.now();
      tx.update(ref, { events: appendAttemptEvent(row, event, "server", now), updatedAtMs: now });
    });
  } catch (error) { console.warn("Analysis access logging failed", error); }
}
