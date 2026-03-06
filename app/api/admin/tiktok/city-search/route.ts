// app/api/admin/tiktok/city-search/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";

function mustEnv(name: string) {
  const v = String(process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function pickCtx(ctx: any[], prefix: string) {
  if (!Array.isArray(ctx)) return "";
  const hit = ctx.find((x: any) => String(x?.id ?? "").startsWith(prefix));
  return String(hit?.text ?? "").trim();
}

export async function GET(req: Request) {
  try {
    // ✅ единый gate: если requireAdmin пропускает — UI получит items
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") ?? "").trim();

    // ✅ чтобы не спамить Mapbox на 1 символ
    if (q.length < 2) return NextResponse.json({ items: [] });

    // ✅ у тебя есть только публичный токен — используем его
    const token = mustEnv("NEXT_PUBLIC_MAPBOX_TOKEN");

    const endpoint =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${encodeURIComponent(token)}` +
      `&types=place` +
      `&limit=6` +
      `&language=en` +
      `&autocomplete=true`;

    const r = await fetch(endpoint, { cache: "no-store" });

    const text = await r.text();
    let j: any = null;
    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }

    if (!r.ok) {
      const msg =
        String(j?.message ?? j?.error ?? "").trim() ||
        `Mapbox error: ${r.status}`;
      return NextResponse.json(
        { error: msg, status: r.status },
        { status: 502 },
      );
    }

    const features = Array.isArray(j?.features) ? j.features : [];

    const items = features
      .map((f: any) => {
        const city = String(f?.text ?? "").trim();
        if (!city) return null;

        const label = String(f?.place_name ?? city).trim();

        const ctx = Array.isArray(f?.context) ? f.context : [];
        const country = pickCtx(ctx, "country.");
        const admin1 = pickCtx(ctx, "region."); // штат/регион

        const center = Array.isArray(f?.center) ? f.center : [];
        const lng = Number.isFinite(Number(center[0])) ? Number(center[0]) : null;
        const lat = Number.isFinite(Number(center[1])) ? Number(center[1]) : null;

        // "US|California|San Francisco" (country|admin1|city)
        const cityId = [country, admin1, city].filter(Boolean).join("|");

        return { cityId, label, city, country, admin1, lat, lng };
      })
      .filter(Boolean);

    return NextResponse.json({ items });
  } catch (e: any) {
    const msg = String(e?.message ?? "city-search failed");
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}