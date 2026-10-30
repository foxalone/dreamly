import type { Firestore } from "firebase-admin/firestore";

import { guestDreamSnapshotId } from "@/app/api/dreams/_lib/guestDreamSnapshot";
import { analysisPreview } from "@/lib/analysisPreview";
import { cleanAnalysis } from "@/lib/publicDreamAnalysis";

const ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

function textOf(data: Record<string, unknown> | undefined): string {
  return typeof data?.text === "string" ? data.text.trim() : "";
}

/**
 * The reading that belongs to this public dream: the guest snapshot or the
 * owner's journal. Never a different person's text.
 */
export async function lookupLinkedAnalysis(
  db: Firestore,
  id: string,
  data: Record<string, unknown>,
): Promise<string> {
  if (data.deleted === true) return "";

  const dreamText = textOf(data);
  const guestId = typeof data.ownerGuestId === "string" ? data.ownerGuestId : "";
  if (guestId && dreamText) {
    const snap = await db.collection("guest_dreams").doc(guestDreamSnapshotId(guestId, dreamText)).get();
    const row = snap.data() as Record<string, unknown> | undefined;
    if (snap.exists && row && row.deleted !== true && textOf(row) === dreamText) {
      const analysis = cleanAnalysis(row.analysis);
      if (analysis) return analysis;
    }
  }

  const uid = typeof data.ownerUid === "string" ? data.ownerUid : "";
  const dreamId = typeof data.ownerDreamId === "string" ? data.ownerDreamId : "";
  if (uid && dreamId && data.sourceType !== "story") {
    const snap = await db.collection("users").doc(uid).collection("dreams").doc(dreamId).get();
    const row = snap.data() as Record<string, unknown> | undefined;
    if (snap.exists && row && row.deleted !== true) {
      const analysis = cleanAnalysis(row.analysisText);
      if (analysis) return analysis;
    }
  }

  if (!guestId) return "";
  const found = await db.collection("guest_dreams").where("sharedId", "==", id).limit(3).get();
  for (const doc of found.docs) {
    const row = doc.data() as Record<string, unknown>;
    if (row.deleted === true || row.guestId !== guestId) continue;
    const analysis = cleanAnalysis(row.analysis);
    if (analysis) return analysis;
  }
  return "";
}

function privateAnalysisRef(db: Firestore, id: string) {
  return db.collection("shared_dreams").doc(id).collection("private").doc("analysis");
}

/**
 * The whole reading. The public dream only keeps a preview; this checks the
 * private copy, then the owner's own record, then a legacy public full text.
 */
export async function readFullSharedDreamAnalysis(
  db: Firestore,
  id: string,
  data: Record<string, unknown>,
): Promise<string> {
  if (data.deleted === true) return "";
  const stored = await privateAnalysisRef(db, id).get();
  const saved = cleanAnalysis((stored.data() as Record<string, unknown> | undefined)?.text);
  if (saved) return saved;
  const linked = await lookupLinkedAnalysis(db, id, data);
  if (linked) return linked;
  if (data.analysisIsPreview === true) return "";
  return cleanAnalysis(data.analysisText);
}

/** Publish a two-line preview. The rest stays in shared_dreams/{id}/private/analysis. */
export async function ensureSharedDreamAnalysis(
  db: Firestore,
  id: string,
  data: Record<string, unknown>,
): Promise<{ preview: string; hasMore: boolean }> {
  const empty = { preview: "", hasMore: false };
  if (data.deleted === true) return empty;
  const full = await readFullSharedDreamAnalysis(db, id, data);
  if (!full) return empty;
  const view = analysisPreview(full);
  try {
    await privateAnalysisRef(db, id).set({ text: full }, { merge: true });
  } catch {
    return {
      preview: cleanAnalysis(data.analysisText) || view.preview,
      hasMore: data.analysisHasMore === true,
    };
  }
  const previewNow = cleanAnalysis(data.analysisText);
  if (previewNow !== view.preview || data.analysisHasMore !== view.hasMore || data.analysisIsPreview !== true) {
    await db.collection("shared_dreams").doc(id).update({
      analysisText: view.preview,
      analysisHasMore: view.hasMore,
      analysisIsPreview: true,
      analysisPublishedAtMs: Date.now(),
    }).catch(() => {});
  }
  return view;
}

export async function ensureSharedDreamAnalyses(db: Firestore, ids: unknown): Promise<Record<string, string>> {
  const unique = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id ?? "").trim()).filter((id) => ID_RE.test(id)))].slice(0, 50);
  const out: Record<string, string> = {};
  await Promise.all(unique.map(async (id) => {
    const snap = await db.collection("shared_dreams").doc(id).get();
    if (!snap.exists) return;
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const published = await ensureSharedDreamAnalysis(db, id, data);
    if (published.preview) out[id] = published.preview;
  }));
  return out;
}
