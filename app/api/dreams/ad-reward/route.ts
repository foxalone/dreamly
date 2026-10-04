import { NextResponse } from "next/server";
import { requireSignedInUid } from "../_lib/requireUser";
import { grantAdReward } from "../_lib/subscription";

type Body = { idToken?: unknown };

/**
 * POST /api/dreams/ad-reward — called by the browser after GPT fires
 * rewardedSlotGranted. Grants one AI-analysis credit to a signed-in user
 * without a subscription, at most AD_REWARDS_PER_DAY times per UTC day.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    const res = await grantAdReward(auth.uid);
    if ("error" in res) return res.error;
    return NextResponse.json({ ok: true, credits: res.credits, leftToday: res.leftToday });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
