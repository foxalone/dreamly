/** AppGallery includes a first guest analysis. Other clients spend an ad credit. */
export const GUEST_FREE_ASKS = 1;
export const GUEST_IP_DAILY_LIMIT = GUEST_FREE_ASKS;

export function guestAnalysisAccess(used: number, ipUsed: number, adCredits: number, appGalleryFirstAnalysis = false) {
  if (adCredits > 0) return "ad" as const;
  if (ipUsed >= GUEST_IP_DAILY_LIMIT) return "ip_limit" as const;
  if (used >= GUEST_FREE_ASKS) return "guest_limit" as const;
  return appGalleryFirstAnalysis ? "free" as const : "first_ad" as const;
}
