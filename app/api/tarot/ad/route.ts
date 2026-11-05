import { NextResponse } from "next/server";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import { completeTarotAd, startTarotAd, TarotUnlockError } from "@/lib/tarot/unlock";
import { checkTarotRequest, requireTarotDraw, tarotActor, tarotFailure, tarotResponseHeaders, tarotSecret, tarotUnlockResponse } from "@/lib/tarot/unlock-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const secret = tarotSecret(), bucket = checkTarotRequest(request, secret, true);
    const body = await request.text();
    if (body.length > 512) throw new TarotUnlockError(400, "INVALID_REQUEST");
    const input = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TarotUnlockError(400, "INVALID_REQUEST");
    const { actor, guestId } = await tarotActor(request);
    if (input.action === "start") {
      if (typeof input.day !== "string" || typeof input.cardId !== "string" || Object.keys(input).some(key => !["action", "day", "cardId"].includes(key))) throw new TarotUnlockError(400, "INVALID_REQUEST");
      const cardId = requireTarotDraw(request, guestId, input.day, input.cardId, secret);
      return NextResponse.json(await startTarotAd(actor, guestId, input.day, cardId, bucket), { headers: tarotResponseHeaders });
    }
    if (input.action !== "complete" || typeof input.challenge !== "string" || Object.keys(input).some(key => !["action", "challenge"].includes(key))) throw new TarotUnlockError(400, "INVALID_REQUEST");
    // Same Offerwall entitlement check used by horoscope; an unavailable or dismissed ad grants nothing.
    if (!cookieFromRequest(request, "FCOEC")) throw new TarotUnlockError(403, "AD_NOT_COMPLETED");
    const grant = await completeTarotAd(actor, guestId, input.challenge);
    requireTarotDraw(request, guestId, grant.day, grant.cardId, secret);
    return tarotUnlockResponse(NextResponse.json({ unlocked: true, ...grant }, { headers: tarotResponseHeaders }), guestId, grant.day, grant.cardId, secret);
  } catch (error) { return tarotFailure(error); }
}
