import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { ANALYSIS_PROMO_DURATION_MS } from "@/lib/analysisPromo";
import { validRewardId } from "@/lib/rewardedReceipt";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { ANDROID_AD_REDEMPTION_MS } from "../_lib/androidReward";
import { markYourfitAttemptEligible, recordAttemptAccess } from "../_lib/analysisAttempts";
import { guestAdReward, newGuestId, readClientIp, readGuestId, setGuestCookie } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { grantAdReward } from "../_lib/subscription";

export const runtime = "nodejs";

const WEB_SESSION_MS = 10 * 60_000;
const WEB_PROMO_STATE = "yourfitAnalysis";

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Start playback's timer, then book one credit after the client reaches the end. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!validRewardId(body?.sessionId) || (body.action !== "start" && body.action !== "complete") ||
        (body.platform !== "web" && body.platform !== "android")) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }
    const { sessionId, action, platform } = body;
    const auth = body.idToken == null ? null : await requireSignedInUid(body.idToken);
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid ?? null;
    const existingGuest = readGuestId(request);
    const guestId = uid ? null : existingGuest ?? (platform === "web" && action === "start" ? newGuestId() : null);
    if (!uid && !guestId) return reply({ code: "AD_REQUIRED" }, 402);

    const db = adminDb();
    const ref = db.collection("androidAnalysisRewards").doc(sessionId);
    const state = await db.runTransaction(async (tx) => {
      const session = (await tx.get(ref)).data();
      const now = Date.now();
      if (!session && platform === "web" && action === "start") {
        tx.create(ref, {
          platform, uid, guestId, state: WEB_PROMO_STATE,
          promoReadyAtMs: now + ANALYSIS_PROMO_DURATION_MS, adDeadlineMs: now + WEB_SESSION_MS,
          expiresAt: Timestamp.fromMillis(now + WEB_SESSION_MS),
        });
        return "playing";
      }
      if (!session || (session.platform ?? "android") !== platform || session.uid !== uid || session.guestId !== guestId) return "denied";
      if (platform === "android") {
        if (session.rewardTarget?.action !== "analysis" || !String(session.unit ?? "").startsWith("ca-app-pub-")) return "denied";
        if (["granted", "redeeming", "redeemed"].includes(session.state) && session.redeemUntilMs > now) return "granted";
        if (session.state !== "pending") return "denied";
      } else if (session.state !== WEB_PROMO_STATE) {
        return "denied";
      }
      if (typeof session.adDeadlineMs !== "number" || now >= session.adDeadlineMs) return "denied";
      if (action === "start") {
        if (typeof session.promoReadyAtMs !== "number") {
          tx.update(ref, { promoReadyAtMs: now + ANALYSIS_PROMO_DURATION_MS });
        }
        return "playing";
      }
      if (typeof session.promoReadyAtMs !== "number") return "denied";
      if (now < session.promoReadyAtMs) return "early";
      if (platform === "android") {
        tx.update(ref, { state: "granted", completedAtMs: now, redeemUntilMs: now + ANDROID_AD_REDEMPTION_MS, rewardSource: "yourfit" });
      }
      return "granted";
    });
    if (state === "denied") return reply({ code: "AD_UNAVAILABLE" }, 403);
    if (state === "early") return reply({ code: "AD_CONFIRMATION_PENDING" }, 409);
    if (platform === "web" && state === "playing") {
      await markYourfitAttemptEligible(body.attemptId, uid, guestId);
    }
    if (platform === "web" && state === "granted") {
      // A lost response or a second Complete request reuses the same credit.
      const rewardId = `yourfit_${sessionId}`;
      if (uid) {
        const grant = await grantAdReward(uid, "analysis", rewardId, db);
        if ("error" in grant && (await grant.error.clone().json()).code !== "AD_NOT_NEEDED") return grant.error;
      } else {
        await guestAdReward(guestId!, readClientIp(request), true, rewardId, db);
      }
      await recordAttemptAccess(body.attemptId, uid, guestId);
    }
    const response = reply({ state });
    return guestId && !existingGuest ? setGuestCookie(response, guestId) : response;
  } catch {
    return reply({ code: "AD_REWARD_FAILED" }, 503);
  }
}
