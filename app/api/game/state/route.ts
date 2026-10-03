// app/api/game/state/route.ts
// Dream Kingdoms: the player's server state. A signed-in user who still has a guest cookie
// gets the guest progress merged into the account first. Also returns the city rank and
// whether someone overtook the player since the last visit.

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { KINGDOM_COLLECTION } from "@/lib/game/kingdomPlacement";
import { cityRank, mergeGuestIntoUser, playerRef, readPlayer, toState } from "../_lib/player";
import { resolveOwner, withOwner } from "../_lib/owner";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const owner = await resolveOwner(req);
  const now = Date.now();

  let merged = 0;
  if (owner.uid && owner.guestId) {
    merged = await mergeGuestIntoUser(owner).catch(() => 0);
  }

  const ref = playerRef(owner.ownerKey);
  const snap = await ref.get();
  const p = readPlayer(snap.data(), owner, now);

  // Buildings placed before the server kept balances: adopt them into the player doc.
  if (!Object.keys(p.placed).length && !owner.newGuest) {
    const bSnap = await adminFirestore().collection(KINGDOM_COLLECTION).where("ownerKey", "==", owner.ownerKey).get();
    if (!bSnap.empty) {
      for (const d of bSnap.docs) {
        const x = d.data();
        p.placed[String(x.buildingId)] = String(x.city ?? "");
        p.cityId = p.cityId ?? (x.cityId ? String(x.cityId) : null);
        p.city = p.city ?? (x.city ? String(x.city) : null);
      }
      if (p.lastCollectAt == null) p.lastCollectAt = now;
      await ref.set(p, { merge: true });
    }
  }

  const rank = snap.exists ? await cityRank(p).catch(() => null) : null;
  const overtaken = Boolean(rank && p.lastRank != null && rank.rank > p.lastRank);
  if (rank && rank.rank !== p.lastRank) await ref.set({ lastRank: rank.rank }, { merge: true });

  return withOwner(
    NextResponse.json(
      { exists: snap.exists || Object.keys(p.placed).length > 0, state: toState(p, now), merged, rank, overtaken },
      { headers: { "Cache-Control": "no-store" } }
    ),
    owner
  );
}
