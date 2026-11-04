import { NextResponse } from "next/server";
import { earliestWorldDay, readFeatured } from "@/lib/featuredHoroscope";
import { completeFeaturedAd, FeaturedAccessError, startFeaturedAd, validateAdInput } from "@/lib/featuredHoroscopeAccess";
import { horoscopeActor, finishAccess } from "@/lib/horoscope/access-http";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import { HoroscopeAccessError } from "@/lib/horoscope/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 512) throw new FeaturedAccessError(400, "INVALID_REQUEST");
    const body = JSON.parse(raw) as Record<string, unknown>;
    const { actor, newGuestId } = await horoscopeActor(request);
    if (body.action === "start") {
      const input = validateAdInput(body);
      if (input.day > earliestWorldDay() || !await readFeatured(input.day)) throw new FeaturedAccessError(404, "NOT_FOUND");
      const challenge = await startFeaturedAd(actor, input);
      return finishAccess(NextResponse.json({ challenge }, { headers }), newGuestId);
    }
    if (body.action !== "complete" || typeof body.challenge !== "string") throw new FeaturedAccessError(400, "INVALID_REQUEST");
    // The existing AdSense Offerwall writes this entitlement only after a completed ad.
    if (!cookieFromRequest(request, "FCOEC")) throw new FeaturedAccessError(403, "AD_NOT_COMPLETED");
    const grant = await completeFeaturedAd(actor, body.challenge);
    return finishAccess(NextResponse.json({ unlocked: true, ...grant }, { headers }), newGuestId);
  } catch (error) {
    const known = error instanceof FeaturedAccessError || error instanceof HoroscopeAccessError;
    const status = known ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ code: known ? error.code : "UNAVAILABLE" }, { status, headers });
  }
}
