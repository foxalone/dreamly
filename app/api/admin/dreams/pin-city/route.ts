// app/api/admin/dreams/pin-city/route.ts
// Admin: give a journal dream without a city the user's city (item → profile
// city → the user's other dreams) and count it on the map.
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";
import { IngestNotFoundError, pinCityForItem } from "@/lib/map/ingestDreamServer";

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    const msg = e?.message === "FORBIDDEN" ? "Forbidden" : "Unauthorized";
    return NextResponse.json({ ok: false, error: msg }, { status: msg === "Forbidden" ? 403 : 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const uid = s(body?.target?.uid);
    const itemId = s(body?.target?.itemId);
    const sourceType = s(body?.target?.sourceType) === "story" ? "story" : "dream";
    if (!uid || !itemId) return NextResponse.json({ ok: false, error: "Bad target" }, { status: 400 });

    const res = await pinCityForItem({ uid, itemId, sourceType, baseUrl: req.url });
    if (!res.city) {
      return NextResponse.json({
        ok: true,
        city: null,
        reason: res.reason ?? "no_city",
      });
    }
    const c = res.city;
    return NextResponse.json({
      ok: true,
      city: { cityId: c.cityId, city: c.city, country: c.country, admin1: c.admin1, citySource: c.source },
    });
  } catch (e: any) {
    if (e instanceof IngestNotFoundError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 404 });
    }
    console.error("admin pin-city error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
