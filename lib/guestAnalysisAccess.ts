/** Shared by the server quota and its regression tests. */
export const GUEST_FREE_ASKS = 1;
export const GUEST_IP_DAILY_LIMIT = 5;

export function guestAnalysisAccess(used: number, ipUsed: number, adCredits: number) {
  // Earned credits must also work when the network's free quota is exhausted.
  if (adCredits > 0) return "ad" as const;
  if (used >= GUEST_FREE_ASKS) return "guest_limit" as const;
  if (ipUsed >= GUEST_IP_DAILY_LIMIT) return "ip_limit" as const;
  return "free" as const;
}
