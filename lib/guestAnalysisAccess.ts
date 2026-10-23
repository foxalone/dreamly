/** One free AI reading per network per UTC day, shared by all guest cookies. */
export const GUEST_FREE_ASKS = 1;
export const GUEST_IP_DAILY_LIMIT = GUEST_FREE_ASKS;

export function guestAnalysisAccess(_used: number, ipUsed: number, adCredits: number) {
  // Lifetime guest usage is diagnostic only; a returning guest gets a new daily slot.
  // Spend the daily free slot before any earned credit.
  if (ipUsed < GUEST_IP_DAILY_LIMIT) return "free" as const;
  if (adCredits > 0) return "ad" as const;
  return "ip_limit" as const;
}
