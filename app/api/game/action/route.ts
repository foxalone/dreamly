// app/api/game/action/route.ts
// Dream Kingdoms: server-validated actions on the player's balance.
//   { type: "sync", taps, catches }  — a batch of taps (capped by elapsed time, see economy.allowedTaps)
//   { type: "collect", buildingId? | buildingIds? } — empty those buildings' storage (or all) into the balance
//   { type: "import", local }        — one-time import of the old browser-only save (capped)
//   { type: "catch_escaped" }        — collect the creatures that escaped from analyzed dreams

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { applyTaps, catchEscaped, collectInto, importLocal, playerRef, readPlayer, toState } from "../_lib/player";
import { resolveOwner, withOwner } from "../_lib/owner";

export const runtime = "nodejs";

type Body = {
  type?: string;
  taps?: number;
  catches?: Record<string, number>;
  local?: { creatures?: number; caught?: Record<string, number>; recent?: string[] };
  buildingId?: string;
  buildingIds?: string[];
};

export async function POST(req: Request) {
  const owner = await resolveOwner(req);
  const body = (await req.json().catch(() => ({}))) as Body;
  const type = body.type;
  if (type !== "sync" && type !== "collect" && type !== "import" && type !== "catch_escaped") {
    return withOwner(NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 }), owner);
  }

  const ref = playerRef(owner.ownerKey);
  const result = await adminFirestore().runTransaction(async (tx) => {
    const now = Date.now();
    const snap = await tx.get(ref);
    const p = readPlayer(snap.data(), owner, now);
    let delta = 0;
    let escapedEmojis: string[] | undefined;
    if (type === "sync") delta = applyTaps(p, Number(body.taps) || 0, body.catches ?? {}, now);
    else if (type === "catch_escaped") {
      escapedEmojis = p.escaped?.emojis ?? [];
      delta = catchEscaped(p, now);
    }
    else if (type === "collect") {
      const ids = Array.isArray(body.buildingIds)
        ? body.buildingIds.filter((x): x is string => typeof x === "string").slice(0, 50)
        : typeof body.buildingId === "string"
          ? body.buildingId
          : undefined;
      delta = collectInto(p, now, ids);
    }
    else delta = importLocal(p, body.local ?? {});
    p.updatedAt = now;
    tx.set(ref, p);
    return { delta, state: toState(p, now), ...(escapedEmojis ? { escapedEmojis } : {}) };
  });

  return withOwner(NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } }), owner);
}
