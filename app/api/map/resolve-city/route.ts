import { NextResponse } from "next/server";
import { parseMapCityId, resolveMapCity } from "@/lib/map/resolveMapCity";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cityId = String(body?.cityId ?? "").trim();
    if (!cityId) return NextResponse.json({ error: "Missing cityId" }, { status: 400 });

    const { country, city } = parseMapCityId(cityId);
    if (!country || !city || cityId.includes("/")) {
      return NextResponse.json({ error: "Bad cityId format" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, ...await resolveMapCity(cityId) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
