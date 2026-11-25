import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

import { hashIp } from "./guestQuota";

/**
 * Deduplicates map ingestion of the same text from the same network and day.
 * Legacy records may contain an analysis, but AI routes never serve those
 * answers: every new guest AI request must spend an earned ad credit.
 * The lens is deliberately not part of the map deduplication key.
 */

const COLLECTION = "guestAskDedup";

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

export function guestAskDedupRef(db: Firestore, ip: string, text: string, dayKey: string) {
  return db.collection(COLLECTION).doc(guestAskDedupId(ip, text, dayKey));
}
