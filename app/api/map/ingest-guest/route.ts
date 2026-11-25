import { NextResponse } from "next/server";
import { newGuestId, readGuestId, setGuestCookie } from "@/app/api/dreams/_lib/guestQuota";
import { ingestGuestDream, type GuestMapDream } from "@/lib/map/ingestGuestDream";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guestId = readGuestId(req) ?? newGuestId();
  const finish = (response: NextResponse) => setGuestCookie(response, guestId);

  try {
    const body = (await req.json().catch(() => ({}))) as GuestMapDream;
    const result = await ingestGuestDream(req, guestId, body, false);
    const status = result.ok || result.skipped ? 200 : 400;
    return finish(NextResponse.json(result, { status }));
  } catch (error) {
    console.error(error);
    return finish(NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 }));
  }
}
