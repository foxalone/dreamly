import { NextResponse } from "next/server";
import { guestAdReward, readClientIp, readGuestId } from "../_lib/guestQuota";

async function handle(req: Request, grant: boolean) {
  const guestId = readGuestId(req);
  if (!guestId) return NextResponse.json({ code: "GUEST_REQUIRED" }, { status: 401 });
  try {
    const result = await guestAdReward(guestId, readClientIp(req), grant);
    if (grant && result.credits === 0) {
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
