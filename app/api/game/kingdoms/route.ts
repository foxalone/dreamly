// app/api/game/kingdoms/route.ts
// Public list of placed Dream Kingdoms buildings for the map's "Kingdoms" layer.
// Only city-level, jittered coordinates and the building kind — no owner ids.

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { KINGDOM_COLLECTION } from "@/lib/game/kingdomPlacement";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const snap = await adminFirestore().collection(KINGDOM_COLLECTION).limit(5000).get();
  const items = snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: createHash("sha1").update(d.id).digest("hex").slice(0, 12),
        buildingId: String(x.buildingId ?? ""),
        cityId: String(x.cityId ?? ""),
        place: [x.city, x.admin1, x.country].filter(Boolean).join(", "),
        lat: Number(x.lat),
        lng: Number(x.lng),
      };
    })
    .filter((x) => x.buildingId && Number.isFinite(x.lat) && Number.isFinite(x.lng));
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
