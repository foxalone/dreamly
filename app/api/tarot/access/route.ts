import { NextResponse } from "next/server";
import { tarotAccessInfo, openTarotReading, TarotUnlockError } from "@/lib/tarot/unlock";
import { checkTarotRequest, requireTarotDraw, tarotActor, tarotFailure, tarotResponseHeaders, tarotSecret, tarotUnlockResponse } from "@/lib/tarot/unlock-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const secret = tarotSecret();
    checkTarotRequest(request, secret, false);
    const url = new URL(request.url), day = url.searchParams.get("day") ?? "", rawCardId = url.searchParams.get("cardId") ?? "";
    const { actor, guestId } = await tarotActor(request);
    const cardId = requireTarotDraw(request, guestId, day, rawCardId, secret);
    const info = await tarotAccessInfo(actor, guestId, day, cardId);
    const response = NextResponse.json(info, { headers: tarotResponseHeaders });
    return info.unlocked ? tarotUnlockResponse(response, guestId, day, cardId, secret) : response;
  } catch (error) { return tarotFailure(error); }
}

export async function POST(request: Request) {
  try {
    const secret = tarotSecret();
    checkTarotRequest(request, secret, true);
    const body = await request.text();
    if (body.length > 512) throw new TarotUnlockError(400, "INVALID_REQUEST");
    const input = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.day !== "string" || typeof input.cardId !== "string" || Object.keys(input).some(key => !["day", "cardId"].includes(key))) throw new TarotUnlockError(400, "INVALID_REQUEST");
    const { actor, guestId } = await tarotActor(request);
    const cardId = requireTarotDraw(request, guestId, input.day, input.cardId, secret);
    const grant = await openTarotReading(actor, guestId, input.day, cardId);
    return tarotUnlockResponse(NextResponse.json({ unlocked: true, ...grant }, { headers: tarotResponseHeaders }), guestId, grant.day, cardId, secret);
  } catch (error) { return tarotFailure(error); }
}
