import { NextResponse } from "next/server";

import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { newGuestId, readGuestId, setGuestCookie } from "@/app/api/dreams/_lib/guestQuota";
import { isReactionKey, readGuestReactions, SHARED_DREAM_ID_RE, toggleGuestReaction } from "@/lib/guestReactions";

export const runtime = "nodejs";
const PRIVATE_RESPONSE = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  const guestId = readGuestId(req);
  if (!guestId) return NextResponse.json({ reactions: {} }, PRIVATE_RESPONSE);
  const ids = [...new Set(new URL(req.url).searchParams.getAll("id"))]
    .filter((id) => SHARED_DREAM_ID_RE.test(id)).slice(0, 50);
  try {
    return NextResponse.json({ reactions: await readGuestReactions(adminDb(), guestId, ids) }, PRIVATE_RESPONSE);
  } catch (error) {
    console.error("Guest reactions read failed", error);
    return NextResponse.json({ error: "Could not load reactions." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const dreamId = typeof body?.dreamId === "string" ? body.dreamId : "";
  const key = body?.key;
  if (!SHARED_DREAM_ID_RE.test(dreamId) || !isReactionKey(key)) {
    return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  }
  const existingGuestId = readGuestId(req);
  const guestId = existingGuestId ?? newGuestId();
  try {
    const result = await toggleGuestReaction(adminDb(), guestId, dreamId, key);
    if (!result) return NextResponse.json({ error: "Dream not found." }, { status: 404 });
    const response = NextResponse.json(result);
    return existingGuestId ? response : setGuestCookie(response, guestId);
  } catch (error) {
    console.error("Guest reaction failed", error);
    return NextResponse.json({ error: "Could not save reaction." }, { status: 500 });
  }
}
