import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { hashIp } from "./guestQuota";

/**
 * One guest asking the SAME dream text from the SAME network on the SAME day
 * is one reading, however many times the dreamly_guest cookie is reset
 * (incognito windows minted a fresh free ask per cookie). /api/dreams/analyze
 * serves the stored answer instead of calling OpenAI or spending quota, and
 * /api/map/ingest-guest skips creating a second guest_dreams doc / map pin.
 *
 * The lens is deliberately NOT part of the key: re-asking the same text with
 * another lens was exactly the cookie-reset pattern this closes.
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
