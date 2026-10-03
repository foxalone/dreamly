/**
 * Dream Kingdoms economy — pure rules shared by the client and the server.
 * Rules doc: Admin → Game (app/app/profile/admin-dashboard/DreamKingdomsDoc.tsx).
 */
import { BUILDINGS } from "./buildings";

export const PER_TAP_GUEST = 3;
export const PER_TAP_SIGNED_IN = 5;
/** Server-side cap on taps per second (client caps itself too). */
export const MAX_TAPS_PER_SEC = 15;
/** Offline storage cap: buildings stop producing after one night. */
export const STORAGE_MINUTES = 8 * 60;
/** Taps are sent to the server in batches at most this often. */
export const SYNC_INTERVAL_MS = 12_000;

export function perTapFor(signedIn: boolean): number {
  return signedIn ? PER_TAP_SIGNED_IN : PER_TAP_GUEST;
}

/** Each extra copy of a building costs this much more than the previous one (Cookie Clicker rule). */
export const COST_GROWTH = 1.15;

/** Price of the next copy when `owned` copies already stand. */
export function nextCost(baseCost: number, owned: number): number {
  return Math.round(baseCost * COST_GROWTH ** Math.max(0, owned));
}

/** How many copies of a placed building the player has (saves from before copies count as 1). */
export function ownedCount(id: string, placedIds: Set<string>, owned?: Record<string, number>): number {
  if (!placedIds.has(id)) return 0;
  return Math.max(1, Math.floor(owned?.[id] ?? 1));
}

/** Creatures per minute from the placed buildings (all copies). */
export function ratePerMin(placedIds: Iterable<string>, owned?: Record<string, number>): number {
  const set = new Set(placedIds);
  let r = 0;
  for (const b of BUILDINGS) r += b.perMin * ownedCount(b.id, set, owned);
  return r;
}

/** What is waiting in storage since the last collect (capped at STORAGE_MINUTES). */
export function storageNow(rate: number, lastCollectAt: number | null, now: number): { amount: number; full: boolean; minutes: number } {
  if (!rate || !lastCollectAt) return { amount: 0, full: false, minutes: 0 };
  const minutes = Math.max(0, (now - lastCollectAt) / 60_000);
  const capped = Math.min(minutes, STORAGE_MINUTES);
  return { amount: Math.floor(capped * rate), full: minutes >= STORAGE_MINUTES, minutes };
}

/** Taps the server accepts for a batch, given the time since the previous sync. */
export function allowedTaps(elapsedMs: number): number {
  const secs = Math.min(Math.max(elapsedMs, 0) / 1000, 120);
  return Math.ceil(secs * MAX_TAPS_PER_SEC) + MAX_TAPS_PER_SEC;
}

/**
 * Split `n` creatures among `slugs` at random (used for creatures collected from buildings,
 * so the collection counters grow too). Weighted: the newest kinds come a bit more often.
 */
export function distribute(
  n: number,
  slugs: string[],
  rand: () => number = Math.random,
  weight: (slug: string) => number = () => 1
): Record<string, number> {
  const out: Record<string, number> = {};
  if (n <= 0 || !slugs.length) return out;
  const picks = Math.min(n, 60);
  const base = Math.floor(n / picks);
  let rest = n - base * picks;
  const ws = slugs.map((s) => Math.max(0, weight(s)));
  const total = ws.reduce((a, b) => a + b, 0) || 1;
  const pick = () => {
    let r = rand() * total;
    for (let k = 0; k < slugs.length; k++) {
      r -= ws[k];
      if (r < 0) return slugs[k];
    }
    return slugs[slugs.length - 1];
  };
  for (let i = 0; i < picks; i++) {
    const slug = pick();
    const add = base + (rest > 0 ? 1 : 0);
    if (rest > 0) rest--;
    out[slug] = (out[slug] ?? 0) + add;
  }
  return out;
}

/**
 * Each building type fills its own storage (its "cube") since it was last emptied; all copies of
 * a type fill the same cube.
 * `collectedAt[id]` falls back to `lastCollectAt` for saves from before per-building storage.
 */
export function buildingStorage(
  placedIds: Iterable<string>,
  collectedAt: Record<string, number> | undefined,
  lastCollectAt: number | null,
  now: number,
  owned?: Record<string, number>
): { by: Record<string, { amount: number; full: boolean }>; total: number; anyFull: boolean } {
  const placed = new Set(placedIds);
  const by: Record<string, { amount: number; full: boolean }> = {};
  let total = 0;
  let anyFull = false;
  for (const b of BUILDINGS) {
    if (!placed.has(b.id)) continue;
    const s = storageNow(b.perMin * ownedCount(b.id, placed, owned), collectedAt?.[b.id] ?? lastCollectAt, now);
    by[b.id] = { amount: s.amount, full: s.full };
    total += s.amount;
    anyFull = anyFull || s.full;
  }
  return { by, total, anyFull };
}
