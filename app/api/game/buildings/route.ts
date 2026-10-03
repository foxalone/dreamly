// app/api/game/buildings/route.ts
// Dream Kingdoms: the player's placed buildings (GET) and placing a building on the map (POST).
// Owner = signed-in uid (Authorization: Bearer <idToken>) or the `dreamly_guest` cookie.
// Placement is city-level from the request IP, with a stable per-owner offset.

import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { adminAuth } from "../../admin/_lib/firebaseAdmin";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { newGuestId, readGuestId, setGuestCookie } from "../../dreams/_lib/guestQuota";
import { BUILDINGS } from "@/lib/game/buildings";
import { GUEST_BUILDING_IDS, KINGDOM_COLLECTION, jitterLatLng } from "@/lib/game/kingdomPlacement";

export const runtime = "nodejs";

type Owner = { ownerKey: string; uid: string | null; guestId: string | null; newGuest: boolean };

async function resolveOwner(req: Request): Promise<Owner> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    try {
      const decoded = await adminAuth().verifyIdToken(token);
      if (decoded?.uid) return { ownerKey: `u_${decoded.uid}`, uid: decoded.uid, guestId: null, newGuest: false };
    } catch {
      /* fall through to guest */
    }
  }
  const existing = readGuestId(req);
  const guestId = existing ?? newGuestId();
  return { ownerKey: `g_${guestId}`, uid: null, guestId, newGuest: !existing };
}

function withOwner<T extends NextResponse>(res: T, owner: Owner): T {
  return owner.guestId ? setGuestCookie(res, owner.guestId) : res;
}

export async function GET(req: Request) {
  const owner = await resolveOwner(req);
  if (owner.newGuest) return withOwner(NextResponse.json({ placed: [] }), owner);
  const snap = await adminFirestore().collection(KINGDOM_COLLECTION).where("ownerKey", "==", owner.ownerKey).get();
  const placed = snap.docs.map((d) => {
    const x = d.data();
    return { buildingId: String(x.buildingId), city: String(x.city ?? ""), country: String(x.country ?? "") };
  });
  return withOwner(NextResponse.json({ placed }), owner);
}

export async function POST(req: Request) {
  const owner = await resolveOwner(req);
  const body = (await req.json().catch(() => ({}))) as { buildingId?: string };
  const building = BUILDINGS.find((b) => b.id === body?.buildingId);
  if (!building) return withOwner(NextResponse.json({ ok: false, error: "Unknown building" }, { status: 400 }), owner);

  if (!owner.uid && !GUEST_BUILDING_IDS.has(building.id)) {
    return withOwner(
      NextResponse.json({ ok: false, code: "AUTH_REQUIRED", error: "Sign in to build more" }, { status: 401 }),
      owner
    );
  }

  const db = adminFirestore();
  const ref = db.collection(KINGDOM_COLLECTION).doc(`${owner.ownerKey}_${building.id}`);
  const existing = await ref.get();
  if (existing.exists) {
    const x = existing.data() ?? {};
    return withOwner(NextResponse.json({ ok: true, already: true, city: x.city ?? "" }), owner);
  }

  const geo = await resolveIpCity(req);
  let lat = geo?.lat ?? null;
  let lng = geo?.lng ?? null;
  if (geo?.cityId && (lat == null || lng == null)) {
    const stats = await db.collection("city_emoji_stats").doc(geo.cityId).get();
    const d = stats.data() ?? {};
    if (Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
      lat = Number(d.lat);
      lng = Number(d.lng);
    }
  }
  if (!geo?.cityId || lat == null || lng == null) {
    return withOwner(
      NextResponse.json({ ok: false, code: "NO_CITY", error: "Could not find your city" }, { status: 200 }),
      owner
    );
  }

  const spot = jitterLatLng(lat, lng, `${owner.ownerKey}|${building.id}`);
  await ref.set({
    ownerKey: owner.ownerKey,
    ownerType: owner.uid ? "user" : "guest",
    uid: owner.uid,
    guestId: owner.guestId,
    buildingId: building.id,
    cityId: geo.cityId,
    city: geo.city,
    admin1: geo.admin1,
    country: geo.country,
    lat: spot.lat,
    lng: spot.lng,
    placedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return withOwner(NextResponse.json({ ok: true, city: geo.city, country: geo.country }), owner);
}
