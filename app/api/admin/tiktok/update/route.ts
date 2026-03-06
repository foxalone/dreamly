// app/api/admin/tiktok/update/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { requireAdmin } from "../../_lib/auth";
import { adminDb, seedUid } from "../../_lib/firebaseAdmin";

type CityPick = {
  cityId: string;
  label: string;
  city?: string;
  country?: string;
  admin1?: string;
  lat?: number | null;
  lng?: number | null;
};

type Body = {
  dreamId?: string;

  city?: CityPick | null;
  ingestMap?: boolean;

  roots?: string[];
  rootsEn?: string[];
  rootsLang?: string | null;

  iconsEn?: string[];
  emojis?: { native: string; id?: string; name?: string }[];

  analysisText?: string | null;
  analysisModel?: string | null;
};

function s(v: any) {
  return String(v ?? "").trim();
}

function cleanArr(a: any, max = 12) {
  if (!Array.isArray(a)) return [];
  return a.map((x) => s(x)).filter(Boolean).slice(0, max);
}

function cleanCity(c: any): CityPick | null {
  if (!c || typeof c !== "object") return null;
  const cityId = s(c.cityId);
  const label = s(c.label);
  if (!cityId || !label) return null;

  const lat = c.lat === null || c.lat === undefined ? null : Number(c.lat);
  const lng = c.lng === null || c.lng === undefined ? null : Number(c.lng);

  return {
    cityId,
    label,
    city: s(c.city) || undefined,
    country: s(c.country) || undefined,
    admin1: s(c.admin1) || undefined,
    lat: Number.isFinite(lat as any) ? (lat as number) : null,
    lng: Number.isFinite(lng as any) ? (lng as number) : null,
  };
}

async function callIngest(req: Request, uid: string, dreamId: string) {
  const url = new URL("/api/map/ingest-dream", req.url);
  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, dreamId }),
  });

  if (!resp.ok) {
    const j = await resp.json().catch(() => ({}));
    throw new Error(j?.error ? `ingest failed: ${j.error}` : `ingest failed: ${resp.status}`);
  }

  return resp.json().catch(() => ({}));
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = (await req.json().catch(() => ({}))) as Body;
    const dreamId = s(body?.dreamId);
    if (!dreamId) return NextResponse.json({ error: "Missing dreamId" }, { status: 400 });

    const uid = seedUid();
    const db = adminDb();

    const city = cleanCity(body.city);
    const ingestMap = body.ingestMap !== false;

    console.log("[tiktok/update] incoming city:", city ? {
      cityId: city.cityId,
      cityLabel: city.label,
      city: city.city ?? null,
      country: city.country ?? null,
      admin1: city.admin1 ?? null,
    } : null);

    const patch: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (body.roots) patch.roots = cleanArr(body.roots, 12);
    if (body.rootsEn) patch.rootsEn = cleanArr(body.rootsEn, 12);
    if (body.rootsLang !== undefined) patch.rootsLang = body.rootsLang ?? null;

    if (body.iconsEn) patch.iconsEn = cleanArr(body.iconsEn, 10);

    if (body.emojis !== undefined) {
      patch.emojis = Array.isArray(body.emojis)
        ? body.emojis
            .map((e) => ({
              native: s(e?.native),
              id: e?.id ? s(e.id) : undefined,
              name: e?.name ? s(e.name) : undefined,
            }))
            .filter((e) => !!e.native)
            .slice(0, 10)
        : [];
    }

    if (body.analysisText !== undefined) {
      const txt = s(body.analysisText);
      patch.analysisText = txt || null;
      patch.analysisAtMs = txt ? Date.now() : null;
      patch.analysisAt = txt ? admin.firestore.FieldValue.serverTimestamp() : null;
      patch.analysisModel = body.analysisModel ?? null;
    }

    if (body.roots || body.rootsEn || body.iconsEn || body.emojis) {
      patch.rootsUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (city) {
      patch.city = {
        cityId: city.cityId,
        label: city.label,
        city: city.city ?? null,
        country: city.country ?? null,
        admin1: city.admin1 ?? null,
        lat: city.lat ?? null,
        lng: city.lng ?? null,
      };
      patch.cityId = city.cityId;
      patch.cityLabel = city.label;
      patch.cityName = city.city ?? null;
      patch.cityCountry = city.country ?? null;
      patch.cityAdmin1 = city.admin1 ?? null;
      patch.country = city.country ?? null;
      patch.admin1 = city.admin1 ?? null;
      patch.lat = city.lat ?? null;
      patch.lng = city.lng ?? null;

      patch.studio = {
        kind: "tiktok",
        cityLabel: city.label,
      };
    }

    await db.doc(`users/${uid}/dreams/${dreamId}`).set(patch, { merge: true });

    if (city) {
      await db.doc(`users/${uid}`).set(
        {
          currentCityId: city.cityId,
          currentCity: city.city ?? null,
          currentCountry: city.country ?? null,
          currentAdmin1: city.admin1 ?? null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    let ingestResult: any = null;
    if (ingestMap) {
      ingestResult = await callIngest(req, uid, dreamId);
    }

    return NextResponse.json({
      ok: true,
      ingested: ingestMap,
      cityId: city?.cityId ?? null,
      ingestResult,
    });
  } catch (e: any) {
    const msg = e?.message ?? "update failed";
    const code = msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
