import { NextResponse } from "next/server";
import { guestAdReward, normalizeGuestAdKind, readClientIp, readGuestId } from "../_lib/guestQuota";

import { validRewardId } from "@/lib/rewardedReceipt";

/**
 * GET  ?kind=analysis|translate      → { credits, leftToday } for that kind
 * POST { rewardId, kind }            → grants one credit of that kind
 * Default kind is "analysis" (the original guest flow).
 */
async function handle(req: Request, grant: boolean) {
  const guestId = readGuestId(req);
  if (!guestId) return NextResponse.json({ code: "GUEST_REQUIRED" }, { status: 401 });
  try {
    const body = grant ? await req.json().catch(() => ({})) : {};
    if (grant && !validRewardId(body.rewardId)) return NextResponse.json({ code: "INVALID_REWARD_ID" }, { status: 400 });
    const kind = normalizeGuestAdKind(grant ? body.kind : new URL(req.url).searchParams.get("kind"));
    const result = await guestAdReward(guestId, readClientIp(req), grant, body.rewardId, undefined, kind);
    if (grant && result.credits === 0 && !result.replayed) {
      return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
    }
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
  return handle(req, true);
}
