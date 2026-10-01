import { NextResponse } from "next/server";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { IngestNotFoundError, ingestDreamServer, normalizeSourceType } from "@/lib/map/ingestDreamServer";

type Body = { uid: string; dreamId: string; sourceType?: "dream" | "story"; skipCity?: boolean };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const uid = String(body?.uid ?? "").trim();
    const itemId = String(body?.dreamId ?? "").trim();
    if (!uid || !itemId) {
      return NextResponse.json({ error: "Missing uid or dreamId" }, { status: 400 });
    }

    const result = await ingestDreamServer({
      uid,
      itemId,
      sourceType: normalizeSourceType(body?.sourceType),
      skipCity: body?.skipCity === true,
      ipCity: await resolveIpCity(req),
      baseUrl: req.url,
      guestId: readGuestId(req),
    });
    return NextResponse.json(result);
  } catch (e: any) {
    if (e instanceof IngestNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
