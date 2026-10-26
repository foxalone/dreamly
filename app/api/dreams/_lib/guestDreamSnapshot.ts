import { createHash } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebaseAdmin";

/** One private admin record per guest and dream, independent of map eligibility. */
export function guestDreamSnapshotId(guestId: string, text: string) {
  const hash = createHash("sha256").update(text.trim()).digest("hex").slice(0, 32);
  return `guest_${guestId}_${hash}`;
}

export async function saveGuestDreamSnapshot(input: {
  guestId: string; text: string; analysis: string; model: string; lens: string;
  lang: string; emojis: { native?: string; id?: string; name?: string }[];
  createdAtMs?: number;
}, db: Firestore = adminFirestore()) {
  const ref = db.collection("guest_dreams").doc(guestDreamSnapshotId(input.guestId, input.text));
  const now = input.createdAtMs ?? Date.now();
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    tx.set(ref, {
      guestId: input.guestId, sourceType: "guest", text: input.text.trim(),
      analysis: input.analysis, analysisModel: input.model, lens: input.lens,
      lang: input.lang, emojis: input.emojis, analysisAtMs: now,
      ...(!existing.exists ? {
        createdAtMs: now, createdAt: FieldValue.serverTimestamp(),
        dateKey: new Date(now).toISOString().slice(0, 10),
        shared: false, deleted: false, imported: false,
      } : {}),
    }, { merge: true });
  });
  return ref.id;
}
