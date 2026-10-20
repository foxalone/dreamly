import { createHash } from "node:crypto";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { attemptOutcome, clientAttemptUpdate, ownsAnalysisAttempt, type AttemptEvent } from "@/lib/analysisAttempts";

export async function startAnalysisAttempt(input: { text: string; uid: string | null; guestId: string | null; lang: string; lens: string }): Promise<string | null> {
  try {
    const now = Date.now();
    const owner = input.guestId ? `g:${input.guestId}` : `u:${input.uid}`;
    const id = createHash("sha256").update(JSON.stringify([owner, input.text, input.lang, input.lens, new Date(now).toISOString().slice(0, 10)])).digest("hex");
    const db = adminFirestore();
    const ref = db.collection("analysis_attempts").doc(id);
    await db.runTransaction(async (tx) => {
      const before = (await tx.get(ref)).data();
      tx.set(ref, { ...input, status: "processing", reason: "processing", clientReported: false, createdAtMs: before?.createdAtMs ?? now, updatedAtMs: now, requestCount: (Number(before?.requestCount) || 0) + 1 }, { merge: true });
    });
    return id;
  } catch (error) { console.warn("Analysis attempt logging failed", error); return null; }
}

export async function finishAnalysisAttempt(id: string | null, status: number, code?: string) {
  if (!id) return;
  try {
    await adminFirestore().collection("analysis_attempts").doc(id).update({ ...attemptOutcome(status, code), clientReported: false, httpStatus: status, updatedAtMs: Date.now() });
  } catch (error) { console.warn("Analysis attempt result logging failed", error); }
}

export async function reportAttemptEvent(id: string, uid: string | null, guestId: string | null, event: AttemptEvent) {
  const db = adminFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.collection("analysis_attempts").doc(id);
    const row = (await tx.get(ref)).data();
    if (!row || !ownsAnalysisAttempt(row, uid, guestId)) return false;
    const update = clientAttemptUpdate(row, event);
    if (update) tx.update(ref, { ...update, clientReported: true, updatedAtMs: Date.now() });
    return true;
  });
}
