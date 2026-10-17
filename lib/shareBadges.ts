/**
 * Fantasy-creature levels for sharing dreams anonymously.
 *
 * The level depends only on how many dreams a person has in the public feed
 * (shared and not deleted). Thresholds roughly double so the next level always
 * looks reachable. Names are localized in `messages.shareBadges.names`.
 *
 *   0      🌙 Dreamer   (no badge yet)
 *   1      🦄 Unicorn
 *   2–5    🧙 Wizard
 *   6–10   🧜 Siren
 *   11–25  🐦‍🔥 Phoenix
 *   26–50  🐉 Dragon
 *   51+    🌌 Oneiros (Greek god of dreams)
 */

export type ShareBadgeId = "dreamer" | "unicorn" | "wizard" | "siren" | "phoenix" | "dragon" | "oneiros";

export type ShareBadge = {
  id: ShareBadgeId;
  emoji: string;
  /** Smallest shared-dream count that earns this level. */
  min: number;
};

export const SHARE_BADGES: readonly ShareBadge[] = [
  { id: "dreamer", emoji: "🌙", min: 0 },
  { id: "unicorn", emoji: "🦄", min: 1 },
  { id: "wizard", emoji: "🧙", min: 2 },
  { id: "siren", emoji: "🧜", min: 6 },
  { id: "phoenix", emoji: "🐦‍🔥", min: 11 },
  { id: "dragon", emoji: "🐉", min: 26 },
  { id: "oneiros", emoji: "🌌", min: 51 },
] as const;

function cleanCount(count: unknown): number {
  const n = Math.floor(Number(count));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isShareBadgeId(v: unknown): v is ShareBadgeId {
  return SHARE_BADGES.some((b) => b.id === v);
}

export function shareBadgeById(id: unknown): ShareBadge | null {
  return SHARE_BADGES.find((b) => b.id === id) ?? null;
}

/** Level for a number of shared (not deleted) dreams. */
export function shareBadgeFor(count: unknown): ShareBadge {
  const n = cleanCount(count);
  let out = SHARE_BADGES[0];
  for (const b of SHARE_BADGES) if (n >= b.min) out = b;
  return out;
}

/** Next level and how many more shares it takes; null at the top level. */
export function nextShareBadge(count: unknown): { badge: ShareBadge; remaining: number } | null {
  const n = cleanCount(count);
  const next = SHARE_BADGES.find((b) => b.min > n);
  return next ? { badge: next, remaining: next.min - n } : null;
}

/** The level reached when the count goes from `before` to `after`, or null if it did not change. */
export function shareBadgeLevelUp(before: unknown, after: unknown): ShareBadge | null {
  const a = shareBadgeFor(before);
  const b = shareBadgeFor(after);
  return b.min > a.min ? b : null;
}

export const SHAREABLE_MIN_CHARS = 20;

export type ShareTextCheck = { ok: true } | { ok: false; reason: "too_short" | "too_long" | "link" | "contact" | "spam" };

/**
 * Cheap automatic check before a GUEST dream goes to the public feed
 * (no account behind it, so nobody to ask afterwards). Not a moderation
 * system: it only keeps out links, contact details and keyboard mashing.
 */
export function checkShareableDreamText(text: unknown, maxChars: number): ShareTextCheck {
  const s = String(text ?? "").trim();
  if (s.length < SHAREABLE_MIN_CHARS) return { ok: false, reason: "too_short" };
  if (s.length > maxChars) return { ok: false, reason: "too_long" };
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(s) || /(?:\+?\d[\s().-]?){8,}/.test(s) || /(^|\s)@[a-z0-9_]{3,}/i.test(s)) {
    return { ok: false, reason: "contact" };
  }
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|io|me|info|xyz|top|link|ly|gg|app|site|online|shop)\b|t\.me\/)/i.test(s)) {
    return { ok: false, reason: "link" };
  }
  // the same character 8+ times in a row, or almost no letters at all
  const letters = (s.match(/\p{L}/gu) ?? []).length;
  if (/(.)\1{7,}/u.test(s) || letters < s.length * 0.5) return { ok: false, reason: "spam" };
  return { ok: true };
}

/**
 * Legacy shared_dreams doc id from the one-share-per-guest era. New guest
 * shares use guestSharedDreamDocId; this id is still read so an old doc can
 * be claimed on sign-in and removed by the admin.
 */
export function guestSharedDocId(guestId: string) {
  return `guest_${guestId}`;
}

/** FNV-1a over the dream text — stable, isomorphic (no node:crypto). */
function dreamTextHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * shared_dreams doc id of a guest's anonymous share, one per DREAM (same
 * guest + same text → same id, so re-sharing the same dream is a no-op).
 */
export function guestSharedDreamDocId(guestId: string, text: string) {
  return `guest_${guestId}_${dreamTextHash(String(text ?? "").trim())}`;
}

/** "0", "1", "2–5", "51+" — the share counts a level covers. */
export function shareBadgeRange(id: ShareBadgeId): string {
  const i = SHARE_BADGES.findIndex((b) => b.id === id);
  if (i < 0) return "";
  const lo = SHARE_BADGES[i].min;
  const next = SHARE_BADGES[i + 1];
  if (!next) return `${lo}+`;
  const hi = next.min - 1;
  return hi === lo ? String(lo) : `${lo}–${hi}`;
}
