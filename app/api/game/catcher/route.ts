import { NextResponse } from "next/server";
import { STORAGE_MINUTES } from "@/lib/game/economy";
import { ESCAPE_TTL_MS, type EscapeState } from "@/lib/game/escape";
import { resolveOwner, withOwner } from "../_lib/owner";
import { escapeStashRef, playerRef, readPlayer } from "../_lib/player";

export async function GET(req: Request) {
  const owner = await resolveOwner(req);
  const now = Date.now();
  const headers = { "Cache-Control": "no-store" };
  // A map visit shouldn't start a separate guest session while the game is opening.
  if (owner.newGuest) return NextResponse.json({ escaped: [], fullAt: null, serverNow: now }, { headers });
  const keys = [owner.ownerKey];
  if (owner.uid && owner.guestId) keys.push(`g_${owner.guestId}`);
  const hints = await Promise.all(keys.map(async (key) => {
    const [player, stash] = await Promise.all([playerRef(key).get(), escapeStashRef(key).get()]);
    const p = readPlayer(player.data(), owner, now);
    const starts = Object.keys(p.placed).map((id) => p.collectedAt?.[id] ?? p.lastCollectAt ?? 0).filter(Boolean);
    const escaped = [p.escaped, stash.data()?.escaped as EscapeState | undefined]
      .filter((entry) => entry && now - entry.at <= ESCAPE_TTL_MS)
      .flatMap((entry) => entry?.emojis ?? []);
    return { escaped, fullAt: starts.length ? Math.min(...starts) + STORAGE_MINUTES * 60_000 : null };
  }));
  const deadlines = hints.flatMap(({ fullAt }) => fullAt === null ? [] : [fullAt]);
  return withOwner(NextResponse.json({
    escaped: hints.flatMap(({ escaped }) => escaped),
    fullAt: deadlines.length ? Math.min(...deadlines) : null,
    serverNow: now,
  }, { headers }), owner);
}
