export const READING_AD_GRANT_MS = 10 * 60_000;

export function readingDreamId(value: unknown): string | null {
  const id = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9_-]{1,120}$/.test(id) ? id : null;
}

/** A rewarded ad opens one public dream's reading, for a few minutes, until it is used. */
export function matchingReadingAdGrant(raw: unknown, dreamId: string, now = Date.now()): boolean {
  if (!raw || typeof raw !== "object") return false;
  const grant = raw as Record<string, unknown>;
  return grant.sharedDreamId === dreamId
    && typeof grant.expiresAtMs === "number"
    && grant.expiresAtMs > now;
}
