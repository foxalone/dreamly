import { NextResponse } from "next/server";
import { earliestWorldDay, featuredId, latestFeatured, publicFeatured, readFeatured } from "@/lib/featuredHoroscope";
import { FeaturedAccessError, openFeatured } from "@/lib/featuredHoroscopeAccess";
import { horoscopeActor, finishAccess } from "@/lib/horoscope/access-http";
import { HoroscopeAccessError } from "@/lib/horoscope/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const item = await latestFeatured();
    return NextResponse.json({ forecast: item ? publicFeatured(item) : null }, { headers });
  } catch (error) {
    console.error("featured horoscope latest", error);
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 256) throw new FeaturedAccessError(400, "INVALID_REQUEST");
    const body = JSON.parse(raw) as { day?: unknown };
    const day = String(body?.day ?? "");
    try { featuredId(day); } catch { throw new FeaturedAccessError(400, "INVALID_REQUEST"); }
    if (day > earliestWorldDay()) throw new FeaturedAccessError(404, "NOT_FOUND");
    const item = await readFeatured(day);
    if (!item) throw new FeaturedAccessError(404, "NOT_FOUND");
    const { actor, newGuestId } = await horoscopeActor(request);
    await openFeatured(actor, day);
    return finishAccess(NextResponse.json({ forecast: item }, { headers }), newGuestId);
  } catch (error) {
    const known = error instanceof FeaturedAccessError || error instanceof HoroscopeAccessError;
    const status = known ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ code: known ? error.code : "UNAVAILABLE" }, { status, headers });
  }
}
