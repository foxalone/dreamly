import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

type Body = { cityId: string };

// cityId = "US|NY|New York"
function parseCityId(cityId: string) {
  const parts = String(cityId ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const [country, admin1, ...rest] = parts;
  const city = rest.join("|"); // на случай если в названии будет "|"
  return { country: country ?? "", admin1: admin1 ?? "", city: city ?? "" };
}

function getMapboxToken() {
  return (
    process.env.MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    ""
  ).trim();
}

async function geocodeCity(params: { city: string; admin1: string; country: string }) {
  const token = getMapboxToken();
  if (!token) throw new Error("Missing MAPBOX_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN");

  // Mapbox geocoding: place
  // query example: "New York, NY, US"
  const q = `${params.city}, ${params.admin1}, ${params.country}`.trim();
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&types=place&language=en`;

  const resp = await fetch(url, { method: "GET" });
  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(data?.message ?? "Mapbox geocoding failed");
  }

  const feat = Array.isArray(data?.features) ? data.features[0] : null;
  const center = feat?.center; // [lng, lat]

  if (!Array.isArray(center) || center.length < 2) {
    throw new Error("No geocoding result");
  }

  const lng = Number(center[0]);
  const lat = Number(center[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Bad geocoding coordinates");
  }

  return { lat, lng, placeName: String(feat?.place_name ?? "") };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const cityId = String(body?.cityId ?? "").trim();
    if (!cityId) {
      return NextResponse.json({ error: "Missing cityId" }, { status: 400 });
    }

    const { country, admin1, city } = parseCityId(cityId);
    if (!country || !city) {
      return NextResponse.json({ error: "Bad cityId format" }, { status: 400 });
    }

    const db = adminFirestore();

    const cityRef = db.collection("cities").doc(cityId);
    const statsRef = db.collection("city_emoji_stats").doc(cityId);

    // если уже есть coords — не делаем запрос к Mapbox
    const citySnap = await cityRef.get();
    if (citySnap.exists) {
      const d = citySnap.data() as any;
      if (typeof d?.lat === "number" && typeof d?.lng === "number") {
        return NextResponse.json({ ok: true, skipped: true, lat: d.lat, lng: d.lng });
      }
    }

    const geo = await geocodeCity({ city, admin1, country });

    // пишем coords и дублируем в stats
    await db.runTransaction(async (tx) => {
      const c = await tx.get(cityRef);
      if (c.exists) {
        const d = c.data() as any;
        if (typeof d?.lat === "number" && typeof d?.lng === "number") return;
      }

      tx.set(
        cityRef,
        {
          cityId,
          city,
          country,
          admin1: admin1 || null,
          lat: geo.lat,
          lng: geo.lng,
          placeName: geo.placeName || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        statsRef,
        {
          lat: geo.lat,
          lng: geo.lng,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true, lat: geo.lat, lng: geo.lng });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}