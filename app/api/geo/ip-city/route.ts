import { NextResponse } from "next/server";

export const runtime = "nodejs";

type IpCity = {
  cityId: string;
  city: string;
  country: string;
  admin1: string;
  lat: number | null;
  lng: number | null;
  source: "vercel" | "ipwhois";
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function firstForwardedIp(req: Request): string {
  const cf = s(req.headers.get("cf-connecting-ip"));
  if (cf) return cf;

  const real = s(req.headers.get("x-real-ip"));
  if (real) return real;

  const xff = s(req.headers.get("x-forwarded-for"));
  if (xff) {
    const first = xff.split(",")[0]?.trim() ?? "";
    if (first) return first;
  }

  return "";
}

function isLocalIp(ip: string) {
  const v = ip.toLowerCase();
  return (
    !v ||
    v === "::1" ||
    v === "127.0.0.1" ||
    v.startsWith("10.") ||
    v.startsWith("192.168.") ||
    v.startsWith("fc") ||
    v.startsWith("fd")
  );
}

function buildCityId(country: string, admin1: string, city: string) {
  if (country && admin1 && city) return `${country}|${admin1}|${city}`;
  if (country && city) return `${country}|${city}`;
  return "";
}

function fromVercelHeaders(req: Request): IpCity | null {
  const country = s(req.headers.get("x-vercel-ip-country")).toUpperCase();
  const admin1 = decodeURIComponent(s(req.headers.get("x-vercel-ip-country-region")));
  const city = decodeURIComponent(s(req.headers.get("x-vercel-ip-city")));
  const latRaw = s(req.headers.get("x-vercel-ip-latitude"));
  const lngRaw = s(req.headers.get("x-vercel-ip-longitude"));

  if (!country || !city) return null;

  const cityId = buildCityId(country, admin1, city);
  if (!cityId) return null;

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  return {
    cityId,
    city,
    country,
    admin1,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    source: "vercel",
  };
}

async function fromIpWhoIs(ip: string): Promise<IpCity | null> {
  if (isLocalIp(ip)) return null;

  const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.success === false) return null;

  const country = s(data?.country_code).toUpperCase();
  const admin1 = s(data?.region);
  const city = s(data?.city);
  if (!country || !city) return null;

  const cityId = buildCityId(country, admin1, city);
  if (!cityId) return null;

  const lat = Number(data?.latitude);
  const lng = Number(data?.longitude);

  return {
    cityId,
    city,
    country,
    admin1,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    source: "ipwhois",
  };
}

export async function GET(req: Request) {
  try {
    const vercel = fromVercelHeaders(req);
    if (vercel) {
      return NextResponse.json({ ok: true, ...vercel });
    }

    const ip = firstForwardedIp(req);
    const lookup = await fromIpWhoIs(ip);
    if (!lookup) {
      return NextResponse.json(
        { ok: false, error: "Could not resolve city from IP", ip: ip || null },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...lookup, ip });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "IP city lookup failed" },
      { status: 500 }
    );
  }
}
