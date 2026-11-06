import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { readingDreamId } from "@/lib/readingAdGrant";
import { translationAdTarget } from "@/lib/translationAdGrant";
import { isSign, utcDay } from "@/lib/horoscope/model";
import { subjectOf, type HoroscopeActor } from "@/lib/horoscope/access";
import { earliestWorldDay, featuredSubject, readFeatured } from "@/lib/featuredHoroscope";
import { canReadFeatured, canTranslateFeatured, validateAdInput } from "@/lib/featuredHoroscopeAccess";
import { tarotSubject } from "@/lib/tarot/unlock";
import { isTarotCardId, canReadTarotAccess, TAROT_ACCESS_COOKIE } from "@/lib/tarot/access";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import { readTranslationUnlock } from "@/app/api/dreams/_lib/translationLedger";
import { tarotAccessInfo } from "@/lib/tarot/unlock";
import { accessInfo as horoscopeAccessInfo } from "@/lib/horoscope/access";
import { hasPaidAccess } from "@/lib/subscriptions/status";
import { paypalFetch } from "./server";

export const ACTION_PRICE = "0.99";
export type ActionKind = "analysis" | "save" | "translate" | "reading" | "horoscope" | "featured" | "tarot" | "love-match";
export type ActionActor = { uid: string } | { guestId: string };
export type ActionTarget =
  | { kind: "analysis" | "save" | "love-match" }
  | { kind: "translate"; sharedDreamId: string; targetLang: string }
  | { kind: "reading"; sharedDreamId: string }
  | { kind: "horoscope"; day: string; sign: string }
  | { kind: "featured"; day: string; purpose: "read" | "translate"; lang?: string }
  | { kind: "tarot"; day: string; cardId: string };

export function actorKey(actor: ActionActor) {
  return "uid" in actor ? `user:${actor.uid}` : `guest:${actor.guestId}`;
}

export async function purchaseActor(request: Request, token: unknown): Promise<{ actor: ActionActor; guestId: string | null }> {
  const guestId = readGuestId(request);
  if (typeof token === "string" && token) {
    const { adminAuth } = await import("@/app/api/admin/_lib/firebaseAdmin");
    const decoded = await adminAuth().verifyIdToken(token);
    return { actor: { uid: decoded.uid }, guestId };
  }
  if (!guestId) throw new Error("GUEST_REQUIRED");
  return { actor: { guestId }, guestId };
}

/** Resolve ad challenges on the server, so a purchase names the exact blocked action. */
export async function resolveActionTarget(request: Request, actor: ActionActor, guestId: string | null, input: Record<string, unknown>): Promise<ActionTarget> {
  const kind = input.kind;
  const db = adminDb();
  if (kind === "analysis") return { kind };
  if (kind === "save" && "uid" in actor) return { kind };
  if (kind === "translate") {
    const target = translationAdTarget(input.sharedDreamId, input.targetLang);
    if (target) return { kind, ...target };
  }
  if (kind === "reading") {
    const id = readingDreamId(input.sharedDreamId);
    if (id) return { kind, sharedDreamId: id };
  }
  const challenge = typeof input.challenge === "string" && /^[0-9a-f-]{36}$/.test(input.challenge) ? input.challenge : "";
  if (kind === "love-match") {
    if (!guestId) throw new Error("GUEST_REQUIRED");
    if (challenge) {
      const data = (await db.doc(`loveMatchAdChallenges/${challenge}`).get()).data();
      if (!data || data.guestId !== guestId || Number(data.expiresAt) <= Date.now()) throw new Error("INVALID_TARGET");
    }
    return { kind };
  }
  if (kind === "horoscope") {
    if (challenge) {
      const data = (await db.doc(`horoscope_ad_challenges/${challenge}`).get()).data();
      if (data?.subject === subjectOf(actor as HoroscopeActor) && data.day === utcDay() && isSign(data.sign) && Number(data.expiresAt) > Date.now()) return { kind, day: data.day, sign: data.sign };
    } else if (isSign(input.sign)) {
      return { kind, day: utcDay(), sign: input.sign };
    }
  }
  if (kind === "featured") {
    if (challenge) {
      const data = (await db.doc(`featured_horoscope_ad_challenges/${challenge}`).get()).data();
      if (data?.subject === featuredSubject(actor) && Number(data.expiresAtMs) > Date.now() && typeof data.day === "string" && (data.purpose === "read" || data.purpose === "translate")) return { kind, day: data.day, purpose: data.purpose, ...(data.lang ? { lang: String(data.lang) } : {}) };
    } else {
      const target = validateAdInput(input);
      if (target.day <= earliestWorldDay() && await readFeatured(target.day) && (target.purpose !== "translate" || await canReadFeatured(actor, target.day))) return { kind, day: target.day, purpose: target.purpose, ...(target.lang ? { lang: target.lang } : {}) };
    }
  }
  if (kind === "tarot" && guestId) {
    const data = challenge ? (await db.doc(`tarot_ad_challenges/${challenge}`).get()).data() : { subject: tarotSubject(actor), guestSubject: tarotSubject({ guestId }), day: input.day, cardId: input.cardId, expiresAt: Date.now() + 1000 };
    const secret = process.env.CRON_SECRET?.trim();
    if (data?.subject === tarotSubject(actor) && data.guestSubject === tarotSubject({ guestId }) && data.day === utcDay() && isTarotCardId(data.cardId) && Number(data.expiresAt) > Date.now() && secret && canReadTarotAccess(cookieFromRequest(request, TAROT_ACCESS_COOKIE), guestId, data.day, data.cardId, secret)) {
      return { kind, day: data.day, cardId: data.cardId };
    }
  }
  throw new Error("INVALID_TARGET");
}

export type ActionOrder = { actor: ActionActor; guestId: string | null; target: ActionTarget; next: string; locale: string; status: "created" | "completed"; createdAtMs: number; captureId?: string };

/** Refuse a payment for a missing or already-open item. */
export async function ensureActionPurchasable(actor: ActionActor, guestId: string | null, target: ActionTarget) {
  const db = adminDb();
  if ("uid" in actor && hasPaidAccess((await db.doc(`users/${actor.uid}`).get()).data())) throw new Error("ALREADY_SUBSCRIBED");
  if (target.kind === "translate" || target.kind === "reading") {
    const id = target.kind === "translate" && target.sharedDreamId.startsWith("analysis:") ? target.sharedDreamId.slice(9) : target.sharedDreamId;
    if (!readingDreamId(id)) throw new Error("INVALID_TARGET");
    const dream = await db.doc(`shared_dreams/${id}`).get();
    if (!dream.exists || dream.data()?.deleted === true) throw new Error("INVALID_TARGET");
    const owner = "uid" in actor ? `users/${actor.uid}` : `guestQuickSymbol/${actor.guestId}`;
    if (target.kind === "reading" && (await db.doc(`${owner}/readingUnlocks/${id}`).get()).exists) throw new Error("ALREADY_UNLOCKED");
    if (target.kind === "translate" && await readTranslationUnlock(db, actor, target.sharedDreamId, target.targetLang)) throw new Error("ALREADY_UNLOCKED");
  }
  if (target.kind === "horoscope" && (await horoscopeAccessInfo(actor, target.sign as import("@/lib/horoscope/model").Sign)).unlocked) throw new Error("ALREADY_UNLOCKED");
  if (target.kind === "featured" && (target.purpose === "read" ? await canReadFeatured(actor, target.day) : await canTranslateFeatured(actor, target.day, target.lang ?? ""))) throw new Error("ALREADY_UNLOCKED");
  if (target.kind === "tarot" && guestId && (await tarotAccessInfo(actor, guestId, target.day, target.cardId as import("@/lib/tarot/deck").MajorArcanaId)).unlocked) throw new Error("ALREADY_UNLOCKED");
}

export function orderPath(orderId: string) {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(orderId)) throw new Error("INVALID_ORDER");
  return `paypalActionOrders/${orderId}`;
}

export function orderMatchesActor(order: ActionOrder, actor: ActionActor, guestId: string | null) {
  return actorKey(order.actor) === actorKey(actor) && (order.target.kind !== "tarot" && order.target.kind !== "love-match" || order.guestId === guestId);
}

export async function capturedOrder(orderId: string) {
  const result = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
  const order = result.json as Record<string, unknown>;
  const units = Array.isArray(order.purchase_units) ? order.purchase_units as Array<Record<string, unknown>> : [];
  const captures = (units[0]?.payments as { captures?: Array<Record<string, unknown>> } | undefined)?.captures ?? [];
  const capture = captures[0];
  const amount = capture?.amount as { currency_code?: string; value?: string } | undefined;
  if (!result.ok || order.status !== "COMPLETED" || capture?.status !== "COMPLETED" || amount?.currency_code !== "USD" || amount?.value !== ACTION_PRICE || units.length !== 1) throw new Error("PAYMENT_NOT_COMPLETED");
  return { captureId: String(capture.id ?? "") };
}

/** Each order is fulfilled once, in the same Firestore transaction as its receipt. */
export async function fulfillActionOrder(orderId: string, captureId: string, db: Firestore = adminDb()) {
  const orderRef = db.doc(orderPath(orderId));
  return db.runTransaction(async tx => {
    const snap = await tx.get(orderRef);
    const order = snap.data() as ActionOrder | undefined;
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.status === "completed") return order;
    const { actor, target } = order;
    const owner = "uid" in actor ? db.doc(`users/${actor.uid}`) : db.doc(`guestQuickSymbol/${actor.guestId}`);
    const now = Date.now();
    if (target.kind === "analysis") tx.set(owner, { adAnalysisCredits: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (target.kind === "save" && "uid" in actor) tx.set(owner, { adSaveCredits: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (target.kind === "translate") tx.set(owner.collection("translationUnlocks").doc(target.sharedDreamId), {
      sharedDreamId: target.sharedDreamId, updatedAtMs: now,
      langs: { [target.targetLang]: { atMs: now, source: "purchase", paid: true } },
    }, { merge: true });
    if (target.kind === "reading") tx.set(owner.collection("readingUnlocks").doc(target.sharedDreamId), { sharedDreamId: target.sharedDreamId, atMs: now, source: "purchase" });
    if (target.kind === "horoscope") tx.set(db.doc(`horoscope_access/${subjectOf(actor)}/days/${target.day}/signs/${target.sign}`), { day: target.day, sign: target.sign, source: "purchase", createdAt: now });
    if (target.kind === "featured") {
      const root = db.collection("featured_horoscope_access").doc(featuredSubject(actor));
      const ref = target.purpose === "read" ? root.collection("readUnlocks").doc(target.day) : root.collection("translationUnlocks").doc(`${target.day}_${target.lang}`);
      tx.set(ref, { day: target.day, lang: target.lang ?? null, source: "purchase", createdAtMs: now });
    }
    if (target.kind === "tarot") tx.set(db.doc(`tarot_read_access/${tarotSubject(actor)}/days/${target.day}`), { day: target.day, cardId: target.cardId, source: "purchase", createdAt: now });
    if (target.kind === "love-match") tx.set(db.doc(`loveMatchPurchases/${orderId}`), { guestId: order.guestId, uid: "uid" in actor ? actor.uid : null, used: false, createdAtMs: now });
    tx.update(orderRef, { status: "completed", captureId, completedAtMs: now });
    return { ...order, status: "completed" as const, captureId };
  });
}
