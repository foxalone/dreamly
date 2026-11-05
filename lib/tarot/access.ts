import { createHmac, timingSafeEqual } from "node:crypto";
import { MAJOR_ARCANA, type MajorArcanaId } from "./deck";

export const TAROT_ACCESS_COOKIE = "dreamly_tarot_access";
export const TAROT_UNLOCK_COOKIE = "dreamly_tarot_unlocked";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SIGNATURE_RE = /^[A-Za-z0-9_-]{43}$/;

function signature(guestId: string, day: string, cardId: MajorArcanaId, secret: string, purpose = "access"): string {
  return createHmac("sha256", secret)
    .update(`tarot-${purpose}:v1:${guestId}:${day}:${cardId}`)
    .digest("base64url");
}

export function isTarotCardId(value: string): value is MajorArcanaId {
  return MAJOR_ARCANA.some(card => card.id === value);
}

export function issueTarotAccess(guestId: string, day: string, cardId: MajorArcanaId, secret: string): string {
  if (!guestId || !DAY_RE.test(day) || !secret) throw new Error("Invalid tarot access input");
  return `v1.${day}.${cardId}.${signature(guestId, day, cardId, secret)}`;
}

export function issueTarotUnlock(guestId: string, day: string, cardId: MajorArcanaId, secret: string): string {
  if (!guestId || !DAY_RE.test(day) || !secret) throw new Error("Invalid tarot unlock input");
  return `v1.${day}.${cardId}.${signature(guestId, day, cardId, secret, "unlock")}`;
}

/** The URL is public-looking, but the reading requires the same browser's HttpOnly guest cookie and signed draw receipt. */
export function canReadTarotAccess(
  token: string | null | undefined,
  guestId: string | null | undefined,
  day: string,
  cardId: string,
  secret: string | null | undefined,
  now = new Date(),
  purpose = "access",
): boolean {
  if (!token || !guestId || !secret || !DAY_RE.test(day) || !isTarotCardId(cardId)) return false;
  if (day !== now.toISOString().slice(0, 10)) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || parts[1] !== day || parts[2] !== cardId || !SIGNATURE_RE.test(parts[3])) return false;
  const received = Buffer.from(parts[3], "base64url");
  const expected = Buffer.from(signature(guestId, day, cardId, secret, purpose), "base64url");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function canReadTarotUnlock(token: string | null | undefined, guestId: string | null | undefined, day: string, cardId: string, secret: string | null | undefined, now = new Date()) {
  return canReadTarotAccess(token, guestId, day, cardId, secret, now, "unlock");
}
