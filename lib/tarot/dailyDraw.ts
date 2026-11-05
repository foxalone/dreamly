import { createHmac, randomInt } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { MAJOR_ARCANA, type MajorArcanaId } from "./deck";
import { recordTarotDiscovery } from "./discoveries";

export type DailyDrawIdentity = { uid: string | null; guestId: string; ipBucket: string | null };
export type DailyDrawResult = { day: string; cardId: MajorArcanaId };

const cardIds = MAJOR_ARCANA.map(card => card.id);

export function isMajorArcanaId(value: unknown): value is MajorArcanaId {
  return typeof value === "string" && cardIds.some(id => id === value);
}

export function pickDailyCard(existing: unknown[], chooseIndex: () => number = () => randomInt(cardIds.length)): MajorArcanaId {
  const saved = existing.find(isMajorArcanaId);
  if (saved) return saved;
  const index = chooseIndex();
  if (!Number.isInteger(index) || index < 0 || index >= cardIds.length) throw new Error("Invalid tarot card index");
  return cardIds[index];
}

function subjectKey(kind: "user" | "guest" | "ip", value: string, secret: string): string {
  return createHmac("sha256", secret).update(`tarot:${kind}:${value}`).digest("hex");
}

/** One server-assigned card per UTC day. Account, browser cookie and trusted IP link repeat opens. */
export async function dailyDraw(
  db: Firestore,
  identity: DailyDrawIdentity,
  secret: string,
  now = new Date(),
  chooseIndex?: () => number,
): Promise<DailyDrawResult> {
  const day = now.toISOString().slice(0, 10);
  const collection = db.collection("tarot_daily_draws").doc(day).collection("subjects");
  const userRef = identity.uid ? collection.doc(subjectKey("user", identity.uid, secret)) : null;
  const guestRef = collection.doc(subjectKey("guest", identity.guestId, secret));
  const ipRef = identity.ipBucket ? collection.doc(subjectKey("ip", identity.ipBucket, secret)) : null;

  return db.runTransaction(async tx => {
    const [userSnap, guestSnap, ipSnap] = await Promise.all([
      userRef ? tx.get(userRef) : null,
      tx.get(guestRef),
      ipRef ? tx.get(ipRef) : null,
    ]);
    const cardId = pickDailyCard([
      userSnap?.data()?.cardId,
      guestSnap.data()?.cardId,
      ipSnap?.data()?.cardId,
    ], chooseIndex);
    if (identity.uid) await recordTarotDiscovery(tx, db, identity.uid, day, cardId, now.getTime());

    // The account wins if an older browser or shared IP already has another draw.
    if (userRef && !userSnap?.exists) tx.create(userRef, { cardId, day, createdAt: now });
    // Keep this browser's card when its network changes or the user signs out.
    if (!guestSnap.exists || (userRef && guestSnap.data()?.cardId !== cardId)) {
      tx.set(guestRef, { cardId, day, createdAt: now });
    }
    // An IP is a fallback for another browser on the same network, never an override.
    if (ipRef && !ipSnap?.exists) tx.create(ipRef, { cardId, day, createdAt: now });
    return { day, cardId };
  });
}
