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

/** Creatures per minute from the placed buildings. */
export function ratePerMin(placedIds: Iterable<string>): number {
  const set = new Set(placedIds);
  let r = 0;
  for (const b of BUILDINGS) if (set.has(b.id)) r += b.perMin;
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
export function distribute(n: number, slugs: string[], rand: () => number = Math.random): Record<string, number> {
  const out: Record<string, number> = {};
  if (n <= 0 || !slugs.length) return out;
  const picks = Math.min(n, 60);
  const base = Math.floor(n / picks);
  let rest = n - base * picks;
  for (let i = 0; i < picks; i++) {
    const slug = slugs[Math.floor(rand() * slugs.length)];
    const add = base + (rest > 0 ? 1 : 0);
    if (rest > 0) rest--;
    out[slug] = (out[slug] ?? 0) + add;
  }
  return out;
}
