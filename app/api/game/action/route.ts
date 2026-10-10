// app/api/game/action/route.ts
// Dream Kingdoms: server-validated actions on the player's balance.
//   { type: "sync", taps, catches }  — a batch of taps (capped by elapsed time, see economy.allowedTaps)
//   { type: "collect", buildingId? | buildingIds? } — empty those buildings' storage (or all) into the balance
//   { type: "import", local }        — one-time import of the old browser-only save (capped)
//   { type: "catch_escaped" }        — collect the creatures that escaped from analyzed dreams

import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { adoptEscapeStash, type EscapeStash } from "@/lib/game/escape";
import { applyTaps, catchEscaped, collectInto, escapeStashRef, hasPlayed, importLocal, playerRef, readPlayer, toState } from "../_lib/player";
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
    const playedBefore = snap.exists && hasPlayed(p);
    let delta = 0;
    let escapedEmojis: string[] | undefined;
    if (type === "sync") delta = applyTaps(p, Number(body.taps) || 0, body.catches ?? {}, now);
    else if (type === "catch_escaped") {
      // Nothing is credited before the first tap — the stash waits until they play.
      if (playedBefore) {
        escapedEmojis = p.escaped?.emojis ?? [];
        delta = catchEscaped(p, now);
      }
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
    // The very first taps make the player real: adopt an escape that has been waiting
    // in kingdom_escapes since before this row existed (reads must precede writes).
    let stash: FirebaseFirestore.DocumentReference | null = null;
    if (!playedBefore && hasPlayed(p)) {
      const sRef = escapeStashRef(owner.ownerKey);
      const sSnap = await tx.get(sRef);
      if (sSnap.exists) {
        adoptEscapeStash(p, sSnap.data() as EscapeStash, now);
        stash = sRef;
      }
    }
    p.updatedAt = now;
    // Only someone who actually played gets (or keeps) a kingdom_players row.
    if (snap.exists || hasPlayed(p)) {
      tx.set(ref, p);
      if (stash) tx.delete(stash);
    }
    return { delta, state: toState(p, now), ...(escapedEmojis ? { escapedEmojis } : {}) };
  });

  return withOwner(NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } }), owner);
}
