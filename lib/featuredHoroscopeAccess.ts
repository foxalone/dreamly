import { randomUUID } from "node:crypto";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { hasPaidAccess } from "@/lib/subscriptions/status";
import { earliestWorldDay, featuredId, featuredSubject, weekKey } from "@/lib/featuredHoroscope";
import type { HoroscopeActor } from "@/lib/horoscope/access";
import { normalizeTranslationLanguage } from "@/lib/translationLanguage";

export class FeaturedAccessError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

const root = (actor: HoroscopeActor) => adminFirestore().collection("featured_horoscope_access").doc(featuredSubject(actor));
const unlockRef = (actor: HoroscopeActor, day: string) => root(actor).collection("readUnlocks").doc(day);
const translationRef = (actor: HoroscopeActor, day: string, lang: string) => root(actor).collection("translationUnlocks").doc(`${day}_${lang}`);

async function paid(actor: HoroscopeActor) {
  if (!("uid" in actor)) return false;
  const snap = await adminFirestore().collection("users").doc(actor.uid).get();
  return hasPaidAccess(snap.data() as Parameters<typeof hasPaidAccess>[0]);
}

export async function canReadFeatured(actor: HoroscopeActor, day: string) {
  return await paid(actor) || (await unlockRef(actor, day).get()).exists;
}

export async function canTranslateFeatured(actor: HoroscopeActor, day: string, lang: string) {
  return await paid(actor) || (await translationRef(actor, day, lang).get()).exists;
}

/** The first distinct full forecast opened in the current UTC+14 week is free. */
export async function openFeatured(actor: HoroscopeActor, day: string, now = Date.now()) {
  featuredId(day);
  if (await paid(actor)) return { source: "subscription" as const };
  const db = adminFirestore();
  const week = weekKey(earliestWorldDay(now));
  const weekRef = root(actor).collection("weeks").doc(week);
  const articleRef = unlockRef(actor, day);
  return db.runTransaction(async tx => {
    const [weekSnap, articleSnap] = await Promise.all([tx.get(weekRef), tx.get(articleRef)]);
    if (articleSnap.exists) return { source: "existing" as const };
    if (weekSnap.exists) throw new FeaturedAccessError(402, "AD_REQUIRED");
    tx.create(weekRef, { week, freeDay: day, createdAtMs: now });
    tx.create(articleRef, { day, source: "weekly_free", createdAtMs: now });
    return { source: "weekly_free" as const };
  });
}

type Purpose = "read" | "translate";
export function validateAdInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new FeaturedAccessError(400, "INVALID_REQUEST");
  const raw = input as Record<string, unknown>;
  const day = String(raw.day ?? "");
  try { featuredId(day); } catch { throw new FeaturedAccessError(400, "INVALID_REQUEST"); }
  const purpose = raw.purpose;
  const lang = purpose === "translate" ? normalizeTranslationLanguage(raw.lang) : null;
  if (purpose !== "read" && purpose !== "translate" || purpose === "translate" && (!lang || lang === "en")) throw new FeaturedAccessError(400, "INVALID_REQUEST");
  return { day, purpose: purpose as Purpose, lang };
}

export async function startFeaturedAd(actor: HoroscopeActor, input: ReturnType<typeof validateAdInput>, now = Date.now()) {
  if (input.purpose === "read" && await canReadFeatured(actor, input.day)) throw new FeaturedAccessError(409, "ALREADY_UNLOCKED");
  if (input.purpose === "translate" && (!(await canReadFeatured(actor, input.day)) || await canTranslateFeatured(actor, input.day, input.lang!))) throw new FeaturedAccessError(409, "NOT_ELIGIBLE");
  const challenge = randomUUID();
  await adminFirestore().collection("featured_horoscope_ad_challenges").doc(challenge).create({
    subject: featuredSubject(actor), ...input, createdAtMs: now, expiresAtMs: now + 10 * 60_000, used: false,
  });
  return challenge;
}

export async function completeFeaturedAd(actor: HoroscopeActor, challenge: string, now = Date.now()) {
  if (!/^[0-9a-f-]{36}$/.test(challenge)) throw new FeaturedAccessError(400, "INVALID_CHALLENGE");
  const db = adminFirestore(), challengeRef = db.collection("featured_horoscope_ad_challenges").doc(challenge);
  return db.runTransaction(async tx => {
    const snap = await tx.get(challengeRef), value = snap.data();
    if (!value || value.subject !== featuredSubject(actor) || value.expiresAtMs <= now || value.used === true) throw new FeaturedAccessError(403, "AD_CHALLENGE_INVALID");
    const input = validateAdInput(value);
    const target = input.purpose === "read" ? unlockRef(actor, input.day) : translationRef(actor, input.day, input.lang!);
    tx.set(target, { day: input.day, lang: input.lang, source: "ad", createdAtMs: now });
    tx.update(challengeRef, { used: true, usedAtMs: now });
    return input;
  });
}
