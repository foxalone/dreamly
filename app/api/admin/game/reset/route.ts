// app/api/admin/game/reset/route.ts
// Admin → Game: wipe the admin's OWN Dream Kingdoms progress (balance, collection, buildings
// on the map) to test the game from scratch. Other players are never touched.

import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { KINGDOM_COLLECTION } from "@/lib/game/kingdomPlacement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let uid: string;
  try {
    uid = await requireAdmin(req);
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNAUTHENTICATED";
    return NextResponse.json({ error: code }, { status: code === "FORBIDDEN" ? 403 : 401 });
  }

  const db = adminFirestore();
  const ownerKey = `u_${uid}`;
  const buildings = await db.collection(KINGDOM_COLLECTION).where("ownerKey", "==", ownerKey).get();

  const batch = db.batch();
  batch.delete(db.collection("kingdom_players").doc(ownerKey));
  for (const d of buildings.docs) batch.delete(d.ref);
  await batch.commit();

  return NextResponse.json({ ok: true, buildingsRemoved: buildings.size });
}
