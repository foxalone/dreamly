// app/api/admin/game/players/route.ts
// Admin → Game: every Dream Kingdoms player with balance, catches and buildings.

import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";
import { adminAuth } from "../../_lib/firebaseAdmin";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { buildingStorage, ratePerMin } from "@/lib/game/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHENTICATED";
    return NextResponse.json({ error: code }, { status: code === "FORBIDDEN" ? 403 : 401 });
  }

  const now = Date.now();
  const snap = await adminFirestore().collection("kingdom_players").orderBy("updatedAt", "desc").limit(500).get();

  const rows = snap.docs
    .map((d) => {
      const x = d.data();
      const placed = (x.placed ?? {}) as Record<string, string>;
      const caught = (x.caught ?? {}) as Record<string, number>;
      const owned = (x.owned ?? {}) as Record<string, number>;
      const rate = ratePerMin(Object.keys(placed), owned);
      return {
        ownerKey: d.id,
        uid: (x.uid as string | null) ?? null,
        type: x.uid ? "user" : "guest",
        creatures: Number(x.creatures) || 0,
        lifetime: Number(x.lifetime) || 0,
        kinds: Object.keys(caught).length,
        taps: Number(x.taps) || 0,
        buildings: Object.keys(placed),
        owned,
        city: (x.city as string | null) ?? null,
        rate,
        storage: buildingStorage(Object.keys(placed), x.collectedAt as Record<string, number> | undefined, (x.lastCollectAt as number | null) ?? null, now, owned).total,
        lastRank: (x.lastRank as number | null) ?? null,
        createdAt: Number(x.createdAt) || null,
        updatedAt: Number(x.updatedAt) || null,
        mergedInto: (x.mergedInto as string | null) ?? null,
      };
    })
    .filter((r) => !r.mergedInto);

  // Names / emails for signed-in players.
  const uids = [...new Set(rows.map((r) => r.uid).filter((u): u is string => !!u))];
  const who: Record<string, { name: string | null; email: string | null }> = {};
  for (let i = 0; i < uids.length; i += 100) {
    const res = await adminAuth()
      .getUsers(uids.slice(i, i + 100).map((uid) => ({ uid })))
      .catch(() => null);
    for (const u of res?.users ?? []) who[u.uid] = { name: u.displayName ?? null, email: u.email ?? null };
  }

  return NextResponse.json({
    players: rows.map((r) => ({ ...r, name: r.uid ? who[r.uid]?.name ?? null : null, email: r.uid ? who[r.uid]?.email ?? null : null })),
  });
}
