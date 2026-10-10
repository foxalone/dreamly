/**
 * Dream Kingdoms — "escaped creatures": right after a dream analysis, the dream's own
 * emojis "escape" into the floating dream catcher (DreamCatcherFab). The grant is written
 * server-side by /api/dreams/analyze (one free/plan dream per day, every ad-paid
 * analysis), the player collects it by
 * opening the game (action "catch_escaped").
 *
 * This module is pure + browser helpers; no firebase imports, safe on client and server.
 * Rules doc: Admin → Game.
 */

/** What is waiting in the catcher (server, kingdom_players.escaped). */
export type EscapeState = {
  /** Matched chapter-1 creatures — credited as exactly these kinds. */
  slugs: string[];
  /** Dream emojis with no matching game creature — credited as random open kinds. */
  extra: number;
  /** The dream's emoji natives, for the badge and the catch animation (matched + unmatched). */
  emojis: string[];
  at: number;
};

/** At most this many creatures escape from one dream (= the emoji pick size). */
export const ESCAPE_MAX = 4;

export function escapeTotal(e: EscapeState | null | undefined): number {
  if (!e) return 0;
  return Math.max(0, (e.slugs?.length ?? 0) + (e.extra ?? 0));
}

/** UTC day used for the one-escape-per-day rule. */
export function escapeDayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function canGrantEscape(lastFreeDay: string | null, now: number, paidWithAd: boolean): boolean {
  return paidWithAd || lastFreeDay !== escapeDayKey(now);
}

/**
 * Add one dream's escaped creatures to what is already waiting. Analysis ad credits
 * are limited per day, so a paid reading must not lose its reward to a pool cap.
 * Pure: returns the next state, never mutates `prev`.
 */
export function addEscape(
  prev: EscapeState | null | undefined,
  matches: { slug: string | null; native: string }[],
  now: number
): EscapeState | null {
  const take = (matches ?? []).filter((m) => typeof m?.native === "string" && m.native).slice(0, ESCAPE_MAX);
  if (!take.length) return prev ?? null;
  const slugs = [...(prev?.slugs ?? [])];
  let extra = Math.max(0, prev?.extra ?? 0);
  const emojis = [...(prev?.emojis ?? [])];
  for (const m of take) {
    if (m.slug) slugs.push(m.slug);
    else extra++;
    emojis.push(m.native);
  }
  return { slugs, extra, emojis, at: now };
}

// ── Browser side: the badge on the floating catcher ─────────────────────────
// The analysis flows write this right after the server grants an escape; the game
// clears it once the creatures are caught. Display only — the server owns the balance.

export type EscapePending = {
  /** All creatures waiting in the catcher, for its badge. */
  emojis: string[];
  /** This reading's creatures, for the note when returning to the journal. */
  latestEmojis?: string[];
  at: number;
  /** The dream the escape came from (its text) — only that card shows the note. */
  key?: string;
};

export const ESCAPE_LS_KEY = "dreamly_game_escape_v1";
/** Fired on the window after the localStorage entry changes, so the FAB updates at once. */
export const ESCAPE_EVENT = "dreamly:escape";
/** A stale entry (the player never came for them) stops showing after two days. */
export const ESCAPE_TTL_MS = 48 * 60 * 60 * 1000;

export function readEscapePending(): EscapePending | null {
  try {
    const raw = localStorage.getItem(ESCAPE_LS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as EscapePending | null;
    if (!v || !Array.isArray(v.emojis) || !v.emojis.length) return null;
    if (!v.at || Date.now() - v.at > ESCAPE_TTL_MS) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeEscapePending(next: EscapePending | null): void {
  try {
    if (next) localStorage.setItem(ESCAPE_LS_KEY, JSON.stringify(next));
    else localStorage.removeItem(ESCAPE_LS_KEY);
  } catch {}
  try {
    window.dispatchEvent(new Event(ESCAPE_EVENT));
  } catch {}
}
