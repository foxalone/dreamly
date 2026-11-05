import { createHash, randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { hasPaidAccess } from "@/lib/subscriptions/status";
import type { MajorArcanaId } from "./deck";

export type TarotActor = { uid: string } | { guestId: string };
export type TarotAccessInfo = { day: string; tier: "guest" | "member" | "paid"; unlocked: boolean; firstFreeAvailable: boolean };
export class TarotUnlockError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
type Dependencies = { db?: Firestore; now?: () => number };
const context = (deps: Dependencies) => ({ db: deps.db ?? adminDb(), now: deps.now?.() ?? Date.now() });
const today = (time: number) => new Date(time).toISOString().slice(0, 10);
const count = (value: unknown) => Math.max(0, Math.floor(Number(value) || 0));
export const tarotSubject = (actor: TarotActor) => `${"uid" in actor ? "user" : "guest"}_${createHash("sha256").update("uid" in actor ? actor.uid : actor.guestId).digest("hex")}`;
const grantPath = (subject: string, day: string) => `tarot_read_access/${subject}/days/${day}`;
const firstFreePath = (subject: string) => `tarot_first_free/${subject}`;
function sameDay(day: string, now: number) { if (day !== today(now)) throw new TarotUnlockError(400, "INVALID_DAY"); }

export async function tarotAccessInfo(actor: TarotActor, guestId: string, day: string, cardId: MajorArcanaId, deps: Dependencies = {}): Promise<TarotAccessInfo> {
  const { db, now } = context(deps);
  sameDay(day, now);
  const subject = tarotSubject(actor), guestSubject = tarotSubject({ guestId });
  const [grant, guestGrant, firstFree, profile] = await Promise.all([
    db.doc(grantPath(subject, day)).get(),
    guestSubject === subject ? Promise.resolve(null) : db.doc(grantPath(guestSubject, day)).get(),
    "uid" in actor ? db.doc(firstFreePath(subject)).get() : Promise.resolve(null),
    "uid" in actor ? db.doc(`users/${actor.uid}`).get() : Promise.resolve(null),
  ]);
  const tier = "uid" in actor ? hasPaidAccess(profile?.data(), now) ? "paid" : "member" : "guest";
  // A guest who signs in after watching an ad keeps that day's access on this browser.
  const ownUnlocked = grant.exists && grant.data()?.cardId === cardId;
  const guestUnlocked = !!guestGrant?.exists && guestGrant.data()?.cardId === cardId;
  if (guestUnlocked && !grant.exists && "uid" in actor) {
    await db.doc(grantPath(subject, day)).create({ day, cardId, source: "guest_transfer", createdAt: now }).catch(() => undefined);
  }
  return { day, tier, unlocked: ownUnlocked || guestUnlocked, firstFreeAvailable: tier === "member" && !firstFree?.exists };
}

/** First signed-in tarot reading is free once per account; a paid plan opens any day's card. */
export async function openTarotReading(actor: TarotActor, guestId: string, day: string, cardId: MajorArcanaId, deps: Dependencies = {}) {
  const { db, now } = context(deps);
  sameDay(day, now);
  const subject = tarotSubject(actor), guestSubject = tarotSubject({ guestId });
  return db.runTransaction(async tx => {
    const grantRef = db.doc(grantPath(subject, day)), guestRef = db.doc(grantPath(guestSubject, day));
    const introRef = "uid" in actor ? db.doc(firstFreePath(subject)) : null;
    const profileRef = "uid" in actor ? db.doc(`users/${actor.uid}`) : null;
    const [grant, guestGrant, intro, profile] = await Promise.all([
      tx.get(grantRef), guestSubject === subject ? Promise.resolve(null) : tx.get(guestRef),
      introRef ? tx.get(introRef) : Promise.resolve(null), profileRef ? tx.get(profileRef) : Promise.resolve(null),
    ]);
    if (grant.exists && grant.data()?.cardId !== cardId) throw new TarotUnlockError(409, "DRAW_MISMATCH");
    if (grant.exists || (guestGrant?.exists && guestGrant.data()?.cardId === cardId)) {
      if (guestGrant?.exists && !grant.exists) tx.set(grantRef, { day, cardId, source: "guest_transfer", createdAt: now });
      return { day, cardId, source: "existing" as const };
    }
    const paid = "uid" in actor && hasPaidAccess(profile?.data(), now);
    if (!paid && (!introRef || intro?.exists)) throw new TarotUnlockError(402, "AD_REQUIRED");
    const source = paid ? "subscription" : "first_free";
    tx.set(grantRef, { day, cardId, source, createdAt: now });
    if (!paid && introRef) tx.create(introRef, { day, cardId, createdAt: now });
    return { day, cardId, source };
  });
}

export async function startTarotAd(actor: TarotActor, guestId: string, day: string, cardId: MajorArcanaId, bucket: string, deps: Dependencies = {}) {
  const { db, now } = context(deps);
  sameDay(day, now);
  const subject = tarotSubject(actor), guestSubject = tarotSubject({ guestId }), challenge = randomUUID();
  await db.runTransaction(async tx => {
    const rateRef = db.doc(`tarot_ad_limits/${day}_${bucket}`);
    const [grant, guestGrant, rate] = await Promise.all([
      tx.get(db.doc(grantPath(subject, day))), guestSubject === subject ? Promise.resolve(null) : tx.get(db.doc(grantPath(guestSubject, day))), tx.get(rateRef),
    ]);
    if ((grant.exists && grant.data()?.cardId === cardId) || (guestGrant?.exists && guestGrant.data()?.cardId === cardId)) throw new TarotUnlockError(409, "ALREADY_UNLOCKED");
    const minute = Math.floor(now / 60_000), used = rate.data()?.minute === minute ? count(rate.data()?.count) : 0;
    if (used >= 5 || count(rate.data()?.dailyCount) >= 60) throw new TarotUnlockError(429, "RATE_LIMITED");
    tx.set(rateRef, { minute, count: used + 1, dailyCount: count(rate.data()?.dailyCount) + 1 });
    tx.set(db.doc(`tarot_ad_challenges/${challenge}`), { subject, guestSubject, day, cardId, createdAt: now, expiresAt: Math.min(now + 10 * 60_000, Date.parse(`${day}T00:00:00Z`) + 86_400_000), used: false });
  });
  return { challenge, day };
}

export async function completeTarotAd(actor: TarotActor, guestId: string, challenge: string, deps: Dependencies = {}) {
  if (!/^[0-9a-f-]{36}$/.test(challenge)) throw new TarotUnlockError(400, "INVALID_CHALLENGE");
  const { db, now } = context(deps), day = today(now), subject = tarotSubject(actor), guestSubject = tarotSubject({ guestId });
  return db.runTransaction(async tx => {
    const challengeRef = db.doc(`tarot_ad_challenges/${challenge}`), snapshot = await tx.get(challengeRef), data = snapshot.data();
    if (!data || data.subject !== subject || data.guestSubject !== guestSubject || data.day !== day || data.expiresAt <= now || typeof data.cardId !== "string") throw new TarotUnlockError(403, "AD_CHALLENGE_INVALID");
    const grantRef = db.doc(grantPath(subject, day)), grant = await tx.get(grantRef);
    if (data.used) {
      if (!grant.exists) throw new TarotUnlockError(409, "AD_ALREADY_USED");
      return { day, cardId: data.cardId as MajorArcanaId };
    }
    if (!grant.exists) tx.set(grantRef, { day, cardId: data.cardId, source: "ad", createdAt: now });
    tx.set(challengeRef, { used: true, usedAt: now }, { merge: true });
    return { day, cardId: data.cardId as MajorArcanaId };
  });
}
