/** Only the first guest analysis may fall back to free when no ad is available. */
export const GUEST_FREE_ASKS = 1;
export const GUEST_IP_DAILY_LIMIT = GUEST_FREE_ASKS;

export function guestAnalysisAccess(used: number, ipUsed: number, adCredits: number, noAd = false) {
  if (adCredits > 0) return "ad" as const;
  if (ipUsed >= GUEST_IP_DAILY_LIMIT) return "ip_limit" as const;
  if (used >= GUEST_FREE_ASKS) return "guest_limit" as const;
  return noAd ? "free" as const : "first_ad" as const;
}
