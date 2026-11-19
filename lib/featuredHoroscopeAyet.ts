import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";

const ATTEMPT_MS = 10 * 60_000;
export const AYET_ACCESS_MS = 2 * 60 * 60_000;
export const AYET_ATTEMPT_COOKIE = "dreamly_ayet_forecast_attempt";
export const AYET_ROUTE = "/api/featured-horoscope/ayet";
export const AYET_ACCESS_PATH = "/api/featured-horoscope";

export class AyetRewardError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function featuredAyetSettings(env: Record<string, string | undefined> = process.env) {
  if (env.AYET_REWARDED_ENABLED !== "true") return null;
  const placement = env.AYET_WEB_PLACEMENT_ID?.trim() ?? "";
  const placementId = Number(placement);
  const adSlot = env.AYET_REWARDED_AD_SLOT?.trim();
  const publisherKey = env.AYET_PUBLISHER_API_KEY?.trim();
  const cookieKey = env.CRON_SECRET?.trim();
  if (!/^[1-9]\d*$/.test(placement) || !Number.isSafeInteger(placementId) || !adSlot || !publisherKey || !cookieKey) return null;
  return { placementId, adSlot, publisherKey, cookieKey };
}

type Attempt = { id: string; day: string; subject: string; challenge: string; expiresAtMs: number };

function seal(payload: object, purpose: "attempt" | "access", key: string) {
  const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", key).update(`featured-ayet:${purpose}:${value}`).digest("base64url");
  return `${value}.${mac}`;
}

function open<T>(token: string | undefined, purpose: "attempt" | "access", key: string, now: number): T | null {
  if (!token || token.length > 1024 || !key) return null;
  const [value, signature, extra] = token.split(".");
  if (!value || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", key).update(`featured-ayet:${purpose}:${value}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const payload = JSON.parse(Buffer.from(value, "base64url").toString()) as T & { expiresAtMs: number };
  return payload.expiresAtMs > now ? payload : null;
}

export function createAyetAttempt(day: string, subject: string, challenge: string, key: string, now = Date.now()) {
  const attempt = { id: randomUUID(), day, subject, challenge, expiresAtMs: now + ATTEMPT_MS };
  return { ...attempt, token: seal(attempt, "attempt", key) };
}

export function readAyetAttempt(token: string | undefined, subject: string, key: string, now = Date.now()) {
  const attempt = open<Attempt>(token, "attempt", key, now);
  return attempt?.subject === subject && typeof attempt.challenge === "string" ? attempt : null;
}

export function ayetAccessCookie(day: string) {
  return `dreamly_ayet_forecast_${day}`;
}

export function issueAyetAccess(attempt: Attempt, expiresAtMs: number, key: string) {
  return seal({ day: attempt.day, subject: attempt.subject, expiresAtMs }, "access", key);
}

export function featuredAyetExpiry(request: Request, day: string, subject: string, now = Date.now(), key = process.env.CRON_SECRET?.trim() ?? "") {
  const pass = open<Pick<Attempt, "day" | "subject" | "expiresAtMs">>(cookieFromRequest(request, ayetAccessCookie(day)), "access", key, now);
  return pass?.day === day && pass.subject === subject ? pass.expiresAtMs : null;
}

export function verifyAyetReward(raw: unknown, attempt: Attempt, key: string) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const reward = raw as Record<string, unknown>;
  const { status, rewarded, externalIdentifier, currency, conversionId, signature } = reward;
  // This placement sends no custom parameters. The signed externalIdentifier is unique per attempt.
  if (status !== "success" || rewarded !== true || externalIdentifier !== attempt.id
    || typeof currency !== "number" || !Number.isFinite(currency) || currency < 0
    || typeof conversionId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(conversionId)
    || typeof signature !== "string" || !/^[a-f0-9]{40}$/i.test(signature)
    || Object.keys(reward).some(key => /^custom_[1-5]$/.test(key))) return null;
  const expected = createHmac("sha1", key).update(`${externalIdentifier}${currency}${conversionId}`).digest();
  return timingSafeEqual(Buffer.from(signature, "hex"), expected) ? conversionId : null;
}

function challengeRef(db: Firestore, challenge: string) {
  if (!/^[0-9a-f-]{36}$/.test(challenge)) throw new AyetRewardError(400, "INVALID_CHALLENGE");
  return db.collection("featured_horoscope_ad_challenges").doc(challenge);
}

function readChallenge(data: FirebaseFirestore.DocumentData | undefined, subject: string, now: number) {
  if (!data || data.subject !== subject || data.purpose !== "read" || typeof data.day !== "string" || !(data.expiresAtMs > now)) {
    throw new AyetRewardError(403, "INVALID_CHALLENGE");
  }
  return data.day;
}

export async function ayetFallbackDay(db: Firestore, challenge: string, subject: string, now = Date.now()) {
  const data = (await challengeRef(db, challenge).get()).data();
  const day = readChallenge(data, subject, now);
  if (data?.used) throw new AyetRewardError(409, "ATTEMPT_USED");
  return day;
}

export async function bookAyetReward(db: Firestore, attempt: Attempt, conversionId: string, now = Date.now()) {
  const ref = challengeRef(db, attempt.challenge);
  return db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    if (readChallenge(data, attempt.subject, now) !== attempt.day) throw new AyetRewardError(403, "INVALID_CHALLENGE");
    if (data!.used) {
      const receipt = data!.ayet;
      if (receipt?.attemptId !== attempt.id || receipt.conversionId !== conversionId || receipt.expiresAtMs <= now) throw new AyetRewardError(409, "ATTEMPT_USED");
      return { expiresAtMs: receipt.expiresAtMs as number, firstConfirmation: false };
    }
    const expiresAtMs = now + AYET_ACCESS_MS;
    tx.update(ref, { used: true, usedAtMs: now, ayet: { attemptId: attempt.id, conversionId, expiresAtMs } });
    return { expiresAtMs, firstConfirmation: true };
  });
}
