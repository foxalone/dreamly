import { readGuestId } from "../_lib/guestQuota";
import { recordAttemptAccess } from "../_lib/analysisAttempts";
import { NextResponse } from "next/server";
import { requireSignedInUid } from "../_lib/requireUser";
import { grantAdReward } from "../_lib/subscription";

import { validRewardId } from "@/lib/rewardedReceipt";
import { translationAdTarget } from "@/lib/translationAdGrant";

type Body = { attemptId?: unknown; idToken?: unknown; kind?: unknown; rewardId?: unknown; sharedDreamId?: unknown; targetLang?: unknown };

/**
 * POST /api/dreams/ad-reward — called by the browser after GPT fires
 * rewardedSlotGranted. Translation grants are bound to one dream and language;
 * analysis/save rewards retain their existing credit model.
 */
async function grantReward(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    if (!validRewardId(body.rewardId)) return NextResponse.json({ code: "INVALID_REWARD_ID" }, { status: 400 });
    const kind = body.kind === "save" ? "save" : body.kind === "translate" ? "translate" : "analysis";
    const target = kind === "translate" ? translationAdTarget(body.sharedDreamId, body.targetLang) : null;
    if (kind === "translate" && !target) return NextResponse.json({ code: "TRANSLATION_TARGET_REQUIRED" }, { status: 400 });
    const res = await grantAdReward(auth.uid, kind, body.rewardId, undefined, target ?? undefined);
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
  if (!response.ok && body.kind === "analysis") {
    const auth = await requireSignedInUid(body.idToken).catch(() => null);
    const uid = auth && !("error" in auth) ? auth.uid : null;
    await recordAttemptAccess(body.attemptId, uid, readGuestId(req), "ad_grant_rejected", { httpStatus: response.status });
  }
  return response;
}
