// app/api/game/buildings/route.ts
// Dream Kingdoms: buy a building and place it on the map (POST), or buy another copy of one
// the player already has (price grows 15% per copy, see economy.nextCost).
// The server checks and charges the balance (kingdom_players); each building starts its own storage clock,
// and places the building city-level from the request IP with a stable per-owner offset.

import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { resolveIpCity } from "@/lib/geo/resolveIpCity";
import { BUILDINGS } from "@/lib/game/buildings";
import { GUEST_BUILDING_IDS, KINGDOM_COLLECTION, jitterLatLng } from "@/lib/game/kingdomPlacement";
import { collectInto, playerRef, readPlayer, toState } from "../_lib/player";
import { nextCost } from "@/lib/game/economy";
import { resolveOwner, withOwner } from "../_lib/owner";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const owner = await resolveOwner(req);
  const body = (await req.json().catch(() => ({}))) as { buildingId?: string };
  const building = BUILDINGS.find((b) => b.id === body?.buildingId);
  const fail = (code: string, status = 200) => withOwner(NextResponse.json({ ok: false, code }, { status }), owner);
  if (!building) return fail("UNKNOWN_BUILDING", 400);
  if (!owner.uid && !GUEST_BUILDING_IDS.has(building.id)) return fail("AUTH_REQUIRED", 401);

  // Where: city from IP (outside the transaction — it may call an external geo service).
  // Not needed for another copy of a building that already stands.
  const db = adminFirestore();
  const pRefPre = playerRef(owner.ownerKey);
  const already = Boolean(((await pRefPre.get()).data()?.placed ?? {})[building.id] !== undefined);
  const geo = already ? null : await resolveIpCity(req);
  let lat = geo?.lat ?? null;
  let lng = geo?.lng ?? null;
  if (geo?.cityId && (lat == null || lng == null)) {
    const d = (await db.collection("city_emoji_stats").doc(geo.cityId).get()).data() ?? {};
    if (Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
      lat = Number(d.lat);
      lng = Number(d.lng);
    }
  }

  const pRef = playerRef(owner.ownerKey);
  const bRef = db.collection(KINGDOM_COLLECTION).doc(`${owner.ownerKey}_${building.id}`);

  const out = await db.runTransaction(async (tx) => {
    const now = Date.now();
    const [pSnap, bSnap] = await Promise.all([tx.get(pRef), tx.get(bRef)]);
    const p = readPlayer(pSnap.data(), owner, now);
    const has = bSnap.exists || p.placed[building.id] !== undefined;
    const owned = has ? Math.max(1, Math.floor(p.owned?.[building.id] ?? 1)) : 0;

    // Another copy of a building the player already has (guests: only one Hut).
    if (has) {
      if (!owner.uid) return { ok: false as const, code: "AUTH_REQUIRED" };
      const cost = nextCost(building.cost, owned);
      collectInto(p, now, building.id); // bank this cube before its rate grows
      if (p.creatures < cost) return { ok: false as const, code: "NOT_ENOUGH" };
      p.creatures -= cost;
      p.owned = { ...(p.owned ?? {}), [building.id]: owned + 1 };
      p.updatedAt = now;
      if (bSnap.exists) tx.set(bRef, { count: owned + 1 }, { merge: true });
      tx.set(pRef, p);
      return { ok: true as const, copies: owned + 1, city: p.placed[building.id] ?? "", state: toState(p, now) };
    }

    if (!geo?.cityId || lat == null || lng == null) return { ok: false as const, code: "NO_CITY" };
    if (p.creatures < building.cost) return { ok: false as const, code: "NOT_ENOUGH" };

    p.creatures -= building.cost;
    p.placed[building.id] = geo.city;
    p.owned = { ...(p.owned ?? {}), [building.id]: 1 };
    p.cityId = p.cityId ?? geo.cityId;
    p.city = p.city ?? geo.city;
    if (p.lastCollectAt == null) p.lastCollectAt = now;
    p.collectedAt = { ...(p.collectedAt ?? {}), [building.id]: now };
    p.updatedAt = now;

    const spot = jitterLatLng(lat, lng, `${owner.ownerKey}|${building.id}`);
    tx.set(bRef, {
      ownerKey: owner.ownerKey,
      ownerType: owner.uid ? "user" : "guest",
      uid: owner.uid,
      guestId: owner.uid ? null : owner.guestId,
      buildingId: building.id,
      count: 1,
      cityId: geo.cityId,
      city: geo.city,
      admin1: geo.admin1,
      country: geo.country,
      lat: spot.lat,
      lng: spot.lng,
      placedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(pRef, p);
    return { ok: true as const, copies: 1, city: geo.city, state: toState(p, now) };
  });

  return withOwner(NextResponse.json(out, { headers: { "Cache-Control": "no-store" } }), owner);
}
