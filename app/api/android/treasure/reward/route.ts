import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { completeHoroscopeAd, HoroscopeAccessError, subjectOf } from "@/lib/horoscope/access";
import { horoscopeActor, setAccessPass } from "@/lib/horoscope/access-http";
import { utcDay } from "@/lib/horoscope/model";
import { completeTarotAd, tarotSubject, TarotUnlockError } from "@/lib/tarot/unlock";
import { requireTarotDraw, tarotActor, tarotSecret, tarotUnlockResponse } from "@/lib/tarot/unlock-http";
import { rewardHeaders, rewardSessions, treasureRewardUnit, validTreasureChallenge } from "./session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const collections = {
  horoscope: "horoscope_ad_challenges",
  tarot: "tarot_ad_challenges",
  "love-match": "loveMatchAdChallenges",
} as const;
type Kind = keyof typeof collections;
const reply = (status: number, body: object) => NextResponse.json(body, { status, headers: rewardHeaders });
const fail = (status: number, code: string) => reply(status, { code });

export async function POST(request: Request) {
  const unit = treasureRewardUnit();
  if (!unit) return fail(503, "AD_UNAVAILABLE");
  try {
    if (request.headers.get("x-dreamly-android") !== "1" || request.headers.get("sec-fetch-site") === "cross-site") {
      return fail(403, "FORBIDDEN");
    }
    const text = await request.text();
    if (text.length > 512) return fail(400, "INVALID_REQUEST");
    const input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)) return fail(400, "INVALID_REQUEST");
    const { kind, challenge, action } = input;
    if (typeof kind !== "string" || !Object.hasOwn(collections, kind) || !validTreasureChallenge(challenge) ||
        (action !== "start" && action !== "complete")) return fail(400, "INVALID_REQUEST");
    const feature = kind as Kind;
    const now = Date.now(), day = utcDay(new Date(now)), db = adminDb();
    const source = db.collection(collections[feature]).doc(challenge);
    const grant = (await source.get()).data();
    if (!grant || typeof grant.expiresAt !== "number" || grant.expiresAt <= now) return fail(403, "AD_CHALLENGE_INVALID");

    let owner: string;
    let finish: () => Promise<NextResponse>;
    if (feature === "horoscope") {
      const { actor, newGuestId } = await horoscopeActor(request);
      owner = subjectOf(actor);
      if (newGuestId || grant.subject !== owner || grant.day !== day) return fail(403, "AD_CHALLENGE_INVALID");
      finish = async () => {
        const access = await completeHoroscopeAd(actor, challenge);
        return setAccessPass(reply(200, { unlocked: true }), request, access);
      };
    } else if (feature === "tarot") {
      const secret = tarotSecret(), { actor, guestId } = await tarotActor(request);
      owner = tarotSubject(actor);
      if (grant.subject !== owner || grant.guestSubject !== tarotSubject({ guestId }) || grant.day !== day ||
          typeof grant.cardId !== "string") return fail(403, "AD_CHALLENGE_INVALID");
      requireTarotDraw(request, guestId, day, grant.cardId, secret);
      finish = async () => {
        const access = await completeTarotAd(actor, guestId, challenge);
        return tarotUnlockResponse(reply(200, { unlocked: true }), guestId, access.day, access.cardId, secret);
      };
    } else {
      const guestId = readGuestId(request);
      if (!guestId || grant.guestId !== guestId || grant.used) return fail(403, "AD_CHALLENGE_INVALID");
      owner = tarotSubject({ guestId });
      finish = async () => {
        const unlocked = await db.runTransaction(async transaction => {
          const current = (await transaction.get(source)).data();
          if (!current || current.guestId !== guestId || current.expiresAt <= Date.now() || current.used) return false;
          transaction.update(source, { completed: true, completedAt: Date.now() });
          return true;
        });
        return unlocked ? reply(200, { unlocked: true }) : fail(403, "AD_CHALLENGE_INVALID");
      };
    }

    const session = db.collection(rewardSessions).doc(challenge);
    if (action === "complete") {
      const receipt = (await session.get()).data();
      if (!receipt || receipt.kind !== feature || receipt.owner !== owner || receipt.unit !== unit) return fail(403, "AD_SESSION_NOT_FOUND");
      if (receipt.state !== "verified") return fail(409, "AD_PENDING");
      return await finish();
    }
    if (grant.used) return fail(409, "AD_CHALLENGE_INVALID");
    const state = await db.runTransaction(async transaction => {
      const current = (await transaction.get(session)).data();
      if (current) return current.kind === feature && current.owner === owner && current.unit === unit ? current.state : null;
      transaction.create(session, {
        kind: feature, owner, unit, state: "pending", createdAtMs: now, deadlineMs: grant.expiresAt,
        expiresAt: Timestamp.fromMillis(grant.expiresAt + 48 * 60 * 60_000),
      });
      return "pending";
    });
    return state ? reply(200, { state, sessionId: challenge, unit }) : fail(409, "AD_CHALLENGE_INVALID");
  } catch (error) {
    if (error instanceof HoroscopeAccessError || error instanceof TarotUnlockError) return fail(error.status, error.code);
    return error instanceof SyntaxError ? fail(400, "INVALID_REQUEST") : fail(503, "UNAVAILABLE");
  }
}
