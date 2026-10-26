import { recordAttemptAccess } from "../_lib/analysisAttempts";
import { NextResponse } from "next/server";
import { allowGuestFirstAnalysisWithoutAd, guestAdReward, normalizeGuestAdKind, readClientIp, readGuestId } from "../_lib/guestQuota";

import { validRewardId } from "@/lib/rewardedReceipt";
import { translationAdTarget } from "@/lib/translationAdGrant";

/**
 * GET  ?kind=analysis|translate      → { credits, leftToday } for that kind
 * POST { rewardId, kind, sharedDreamId?, targetLang? } → grants one action;
 * translate requires the selected dream and language and cannot be banked.
 * Default kind is "analysis" (the original guest flow).
 */
async function handle(req: Request, grant: boolean) {
  const guestId = readGuestId(req);
  if (!guestId) return NextResponse.json({ code: "GUEST_REQUIRED" }, { status: 401 });
  try {
    const body = grant ? await req.json().catch(() => ({})) : {};
    if (grant && body.noAdAvailable === true) {
      if (body.kind !== "analysis") return NextResponse.json({ code: "INVALID_KIND" }, { status: 400 });
      const allowed = await allowGuestFirstAnalysisWithoutAd(guestId, readClientIp(req));
      return NextResponse.json({ firstAnalysisFree: allowed }, { status: allowed ? 200 : 403, headers: { "Cache-Control": "no-store" } });
    }
    if (grant && !validRewardId(body.rewardId)) return NextResponse.json({ code: "INVALID_REWARD_ID" }, { status: 400 });
    const query = new URL(req.url).searchParams;
    const kind = normalizeGuestAdKind(grant ? body.kind : query.get("kind"));
    const target = kind === "translate"
      ? translationAdTarget(grant ? body.sharedDreamId : query.get("sharedDreamId"), grant ? body.targetLang : query.get("targetLang"))
      : null;
    if (grant && kind === "translate" && !target) return NextResponse.json({ code: "TRANSLATION_TARGET_REQUIRED" }, { status: 400 });
    const result = await guestAdReward(guestId, readClientIp(req), grant, body.rewardId, undefined, kind, target ?? undefined);
    if (grant && result.credits === 0 && !result.replayed) {
      return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
    }
    if (grant && kind === "analysis") await recordAttemptAccess(body.attemptId, null, guestId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ code: "AD_REWARD_FAILED" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req, false);
}

// Called only after rewardedSlotGranted, like the signed-in /ad-reward route.
export async function POST(req: Request) {
  const body = (await req.clone().json().catch(() => ({}))) ?? {};
  const response = await handle(req, true);
  if (body.kind === "analysis") {
    const guestId = readGuestId(req);
    // A denied first-free fallback is an eligibility decision, not a broken grant.
    if (!response.ok && (body.noAdAvailable !== true || response.status >= 500)) await recordAttemptAccess(body.attemptId, null, guestId, "ad_grant_rejected", { httpStatus: response.status });
    if (response.ok && body.noAdAvailable === true) await recordAttemptAccess(body.attemptId, null, guestId, "guest_free_access");
  }
  return response;
}
