/** Shared by the server quota and its regression tests. */
export const GUEST_FREE_ASKS = 1;
// 2 per network per day: one real second visitor still gets a reading, but
// clearing the guest cookie to re-ask stops paying off (2026-10-09).
export const GUEST_IP_DAILY_LIMIT = 2;

export function guestAnalysisAccess(used: number, ipUsed: number, adCredits: number) {
  // Earned credits must also work when the network's free quota is exhausted.
  if (adCredits > 0) return "ad" as const;
  if (used >= GUEST_FREE_ASKS) return "guest_limit" as const;
  if (ipUsed >= GUEST_IP_DAILY_LIMIT) return "ip_limit" as const;
  return "free" as const;
}
