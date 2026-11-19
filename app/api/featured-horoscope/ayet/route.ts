import { NextResponse } from "next/server";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { featuredSubject } from "@/lib/featuredHoroscope";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import {
  AYET_ACCESS_PATH, AYET_ATTEMPT_COOKIE, AYET_ROUTE, AyetRewardError, ayetAccessCookie, ayetFallbackDay,
  bookAyetReward, createAyetAttempt, featuredAyetExpiry, featuredAyetSettings, issueAyetAccess,
  readAyetAttempt, verifyAyetReward,
} from "@/lib/featuredHoroscopeAyet";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" } as const;

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new AyetRewardError(403, "FORBIDDEN");
    }
    const config = featuredAyetSettings();
    if (!config) throw new AyetRewardError(503, "UNAVAILABLE");
    const guestId = readGuestId(request);
    if (!guestId || request.headers.has("authorization")) throw new AyetRewardError(403, "GUEST_REQUIRED");
    const subject = featuredSubject({ guestId });
    const raw = await request.text();
    if (raw.length > 2048) throw new AyetRewardError(400, "INVALID_REQUEST");
    const body = JSON.parse(raw) as { action?: unknown; challenge?: unknown; reward?: unknown } | null;

    if (body?.action === "start") {
      if (typeof body.challenge !== "string") throw new AyetRewardError(400, "INVALID_CHALLENGE");
      if (cookieFromRequest(request, "FCOEC")) throw new AyetRewardError(409, "GOOGLE_ENTITLED");
      const day = await ayetFallbackDay(adminFirestore(), body.challenge, subject);
      if (featuredAyetExpiry(request, day, subject)) throw new AyetRewardError(409, "ALREADY_UNLOCKED");
      const attempt = createAyetAttempt(day, subject, body.challenge, config.cookieKey);
      const response = NextResponse.json({ placementId: config.placementId, adSlot: config.adSlot, attemptId: attempt.id }, { headers });
      response.cookies.set(AYET_ATTEMPT_COOKIE, attempt.token, { ...cookieOptions, path: AYET_ROUTE, expires: new Date(attempt.expiresAtMs) });
      return response;
    }

    if (body?.action !== "complete") throw new AyetRewardError(400, "INVALID_REQUEST");
    const attempt = readAyetAttempt(cookieFromRequest(request, AYET_ATTEMPT_COOKIE), subject, config.cookieKey);
    const conversionId = attempt && verifyAyetReward(body.reward, attempt, config.publisherKey);
    if (!attempt || !conversionId) throw new AyetRewardError(403, "INVALID_REWARD");

    const { expiresAtMs, firstConfirmation } = await bookAyetReward(adminFirestore(), attempt, conversionId);
    if (firstConfirmation) console.info("rewarded_video_confirmed", { feature: "featured_forecast", provider: "ayet" });
    const response = NextResponse.json({ unlocked: true, firstConfirmation }, { headers });
    response.cookies.set(ayetAccessCookie(attempt.day), issueAyetAccess(attempt, expiresAtMs, config.cookieKey), {
      ...cookieOptions, path: AYET_ACCESS_PATH, expires: new Date(expiresAtMs),
    });
    return response;
  } catch (error) {
    const status = error instanceof AyetRewardError ? error.status : error instanceof SyntaxError ? 400 : 503;
    if (status === 503 && !(error instanceof AyetRewardError)) console.error("Featured ayeT confirmation failed", error);
    return NextResponse.json({ code: error instanceof AyetRewardError ? error.code : "UNAVAILABLE" }, { status, headers });
  }
}
