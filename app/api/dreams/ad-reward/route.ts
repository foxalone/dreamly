import { grantAccountHouseAd } from "../_lib/accountHouseAd";
import { readGuestId } from "../_lib/guestQuota";
import { recordAttemptAccess } from "../_lib/analysisAttempts";
import { NextResponse } from "next/server";
import { requireSignedInUid } from "../_lib/requireUser";
import { grantAdReward, grantReadingReward } from "../_lib/subscription";

import { readingDreamId } from "@/lib/readingAdGrant";
import { validRewardId } from "@/lib/rewardedReceipt";
import { translationAdTarget } from "@/lib/translationAdGrant";
import { offerwallAnalysisReceiptId } from "../_lib/offerwallReward";

type Body = { checkOnly?: unknown; noAdAvailable?: unknown; dreamText?: unknown; dreamId?: unknown; attemptId?: unknown; idToken?: unknown; kind?: unknown; rewardId?: unknown; sharedDreamId?: unknown; targetLang?: unknown };

/**
 * POST /api/dreams/ad-reward — books the completed Offerwall action.
 * Each analysis entitlement earns one credit for its owner.
 */
async function grantReward(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    if (body.noAdAvailable === true) {
      if (body.kind === "analysis") return NextResponse.json({ code: "AD_UNVERIFIED" }, { status: 403 });
      if (body.kind !== "translate" && body.kind !== "reading") return NextResponse.json({ code: "INVALID_KIND" }, { status: 400 });
      const allowed = await grantAccountHouseAd(auth.uid, readGuestId(req), body.kind, body.sharedDreamId, body.targetLang, undefined, undefined, body.checkOnly === true);
      return NextResponse.json({ yourfitPromo: allowed }, { status: allowed ? 200 : 403, headers: { "Cache-Control": "no-store" } });
    }
    if (!validRewardId(body.rewardId)) return NextResponse.json({ code: "INVALID_REWARD_ID" }, { status: 400 });
    if (body.kind === "reading") {
      const sharedDreamId = readingDreamId(body.sharedDreamId);
      if (!sharedDreamId) return NextResponse.json({ code: "READING_TARGET_REQUIRED" }, { status: 400 });
      const reading = await grantReadingReward(auth.uid, body.rewardId, sharedDreamId);
      if ("error" in reading) return reading.error;
      return NextResponse.json({ ok: true, credits: reading.credits, leftToday: reading.leftToday });
    }
    const kind = body.kind === "save" ? "save" : body.kind === "translate" ? "translate" : "analysis";
    const receiptId = kind === "analysis" ? offerwallAnalysisReceiptId(req) : body.rewardId;
    if (!receiptId) return NextResponse.json({ code: "AD_UNVERIFIED" }, { status: 403 });
    const target = kind === "translate" ? translationAdTarget(body.sharedDreamId, body.targetLang) : null;
    if (kind === "translate" && !target) return NextResponse.json({ code: "TRANSLATION_TARGET_REQUIRED" }, { status: 400 });
    const res = await grantAdReward(auth.uid, kind, receiptId, undefined, target ?? undefined);
    if ("error" in res) return res.error;
    if (kind === "analysis") await recordAttemptAccess(body.attemptId, auth.uid, readGuestId(req));
    return NextResponse.json({ ok: true, credits: res.credits, leftToday: res.leftToday });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Persist rejected grants on the server even if the browser loses the response. */
export async function POST(req: Request) {
  const body = (await req.clone().json().catch(() => ({}))) ?? {};
  const response = await grantReward(req);
  if (!response.ok && body.kind === "analysis" && (body.noAdAvailable !== true || response.status >= 500)) {
    const auth = await requireSignedInUid(body.idToken).catch(() => null);
    const uid = auth && !("error" in auth) ? auth.uid : null;
    await recordAttemptAccess(body.attemptId, uid, readGuestId(req), "ad_grant_rejected", { httpStatus: response.status });
  }
  return response;
}
