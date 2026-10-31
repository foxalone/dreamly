import { NextResponse } from "next/server";
import { readForwardedIp, resolveIpCity, type IpCity } from "@/lib/geo/resolveIpCity";

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function isLocalIp(ip: string) {
  const v = ip.toLowerCase();
  return !v || v === "::1" || v === "127.0.0.1" || v.startsWith("10.") || v.startsWith("192.168.") || v.startsWith("fc") || v.startsWith("fd");
}

/** Local dev has no visitor IP. ipwho.is then sees this machine's public address. */
async function lookupThisNetwork(): Promise<(IpCity & { ip: string }) | null> {
  const resp = await fetch("https://ipwho.is/", {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.success === false) return null;
  const city = s(data?.city);
  const country = s(data?.country_code).toUpperCase();
  const lat = Number(data?.latitude);
  const lng = Number(data?.longitude);
  if (!city || !country || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    cityId: `${country}|${city}`,
    city,
    country,
    admin1: s(data?.region),
    lat,
    lng,
    source: "ipwhois",
    ip: s(data?.ip),
  };
}

export async function GET(req: Request) {
  try {
    const ip = readForwardedIp(req);
    let geo = await resolveIpCity(req, 4000).catch(() => null);
    if ((!geo || geo.lat == null || geo.lng == null) && isLocalIp(ip)) {
      geo = await lookupThisNetwork().catch(() => null);
    }
    if (!geo || geo.lat == null || geo.lng == null) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(geo.lat));
    url.searchParams.set("longitude", String(geo.lng));
    url.searchParams.set("current", "temperature_2m,weather_code");
    const weather = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    const data = await weather.json().catch(() => ({}));
    const temp = Number(data?.current?.temperature_2m);
    const code = Number(data?.current?.weather_code);
    if (!weather.ok || !Number.isFinite(temp) || !Number.isFinite(code)) {
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json(
      { ok: true, city: geo.city, tempC: Math.round(temp), code },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Weather lookup failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
