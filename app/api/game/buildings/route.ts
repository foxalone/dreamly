// app/api/game/buildings/route.ts
// Dream Kingdoms: buy a building (POST), or buy another copy of one
// the player already has (price grows 15% per copy, see economy.nextCost).
// The server checks and charges the balance (kingdom_players); each building starts its own storage clock,
// and places it in a known city when possible. Otherwise it is saved until the city is known.

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { BUILDINGS } from "@/lib/game/buildings";
import { GUEST_BUILDING_IDS, KINGDOM_COLLECTION } from "@/lib/game/kingdomPlacement";
import { collectInto, playerRef, readPlayer, toState } from "../_lib/player";
import { nextCost } from "@/lib/game/economy";
import { resolveOwner, withOwner } from "../_lib/owner";
import { buildingMapData, resolveBuildingCity } from "../_lib/placement";

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
  const geo = already ? null : await resolveBuildingCity(req, owner).catch(() => null);

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

    if (p.creatures < building.cost) return { ok: false as const, code: "NOT_ENOUGH" };

    p.creatures -= building.cost;
    p.placed[building.id] = geo?.city ?? "";
    p.owned = { ...(p.owned ?? {}), [building.id]: 1 };
    p.cityId = p.cityId ?? geo?.cityId ?? null;
    p.city = p.city ?? geo?.city ?? null;
    if (p.lastCollectAt == null) p.lastCollectAt = now;
    p.collectedAt = { ...(p.collectedAt ?? {}), [building.id]: now };
    p.updatedAt = now;

    if (geo) tx.set(bRef, buildingMapData(owner, building.id, 1, geo));
    tx.set(pRef, p);
    return { ok: true as const, copies: 1, city: geo?.city ?? "", state: toState(p, now) };
  });

  return withOwner(NextResponse.json(out, { headers: { "Cache-Control": "no-store" } }), owner);
}
