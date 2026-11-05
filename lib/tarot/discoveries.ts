import type { Firestore, Transaction } from "firebase-admin/firestore";
import { isTarotCardId } from "./access";
import type { MajorArcanaId } from "./deck";

export type TarotDiscovery = { day: string; cardId: MajorArcanaId; discoveredAtMs: number };
export type TarotCollectionEntry = { cardId: MajorArcanaId; count: number; lastDay: string };

export function tarotDiscoveryRef(db: Firestore, uid: string, day: string, cardId: MajorArcanaId) {
  return db.collection("users").doc(uid).collection("tarotCards").doc(`${day}_${cardId}`);
}

export function tarotDiscoveryData(day: string, cardId: MajorArcanaId, discoveredAtMs: number): TarotDiscovery {
  return { day, cardId, discoveredAtMs };
}

function tarotCountRef(db: Firestore, uid: string, cardId: MajorArcanaId) {
  return db.collection("users").doc(uid).collection("tarotCardCounts").doc(cardId);
}

/** One discovery per card and UTC day; the compact count changes only for a new discovery. */
export async function recordTarotDiscovery(tx: Transaction, db: Firestore, uid: string, day: string, cardId: MajorArcanaId, discoveredAtMs: number) {
  const discoveryRef = tarotDiscoveryRef(db, uid, day, cardId);
  if ((await tx.get(discoveryRef)).exists) return;
  const countRef = tarotCountRef(db, uid, cardId);
  const existing = (await tx.get(countRef)).data() as Partial<TarotCollectionEntry> | undefined;
  const count = Number.isSafeInteger(existing?.count) && (existing?.count ?? 0) > 0 ? existing!.count! : 0;
  const lastDay = typeof existing?.lastDay === "string" && existing.lastDay > day ? existing.lastDay : day;
  tx.create(discoveryRef, tarotDiscoveryData(day, cardId, discoveredAtMs));
  tx.set(countRef, { cardId, count: count + 1, lastDay } satisfies TarotCollectionEntry);
}

/** Attach a signed draw receipt to an account once, including a guest draw made before sign-in. */
export async function claimTarotDiscovery(db: Firestore, uid: string, day: string, cardId: MajorArcanaId, discoveredAtMs = Date.now()) {
  await db.runTransaction(tx => recordTarotDiscovery(tx, db, uid, day, cardId, discoveredAtMs));
}

export function parseTarotCollectionEntry(value: unknown): TarotCollectionEntry | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.cardId !== "string" || !isTarotCardId(data.cardId) ||
      typeof data.count !== "number" || !Number.isSafeInteger(data.count) || data.count < 1 ||
      typeof data.lastDay !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.lastDay)) return null;
  return { cardId: data.cardId, count: data.count, lastDay: data.lastDay };
}
