import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { hashIp } from "./guestQuota";

/**
 * Deduplicates map ingestion of the same text from the same network and day.
 * Legacy records may contain an analysis, but AI routes never serve those
 * answers: every new guest AI request must spend an earned ad credit.
 * The lens is deliberately not part of the map deduplication key.
 */

const COLLECTION = "guestAskDedup";

export type GuestAskDedup = {
  analysis?: string;
  model?: string | null;
  lens?: string | null;
  emojis?: { native: string; id?: string; name?: string }[];
  emojiModel?: string | null;
  guestDreamId?: string | null;
  createdAtMs?: number;
};

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function guestAskDedupId(ip: string, text: string, dayKey = utcDayKey()) {
  const textHash = createHash("sha256").update(normalizeText(text)).digest("hex").slice(0, 32);
  return `${hashIp(ip)}_${dayKey}_${textHash}`;
}

export async function readGuestAskDedup(ip: string, text: string): Promise<GuestAskDedup | null> {
  const snap = await adminDb().collection(COLLECTION).doc(guestAskDedupId(ip, text)).get();
  return snap.exists ? (snap.data() as GuestAskDedup) : null;
}

/** Merge, so analyze (answer) and ingest-guest (guestDreamId) each add their part. */
export async function writeGuestAskDedup(ip: string, text: string, data: GuestAskDedup) {
  await adminDb()
    .collection(COLLECTION)
    .doc(guestAskDedupId(ip, text))
    .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
