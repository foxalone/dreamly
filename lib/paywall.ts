/**
 * One paywall for the whole site. Any page or hook that hits a limit calls
 * openPaywall(...); <PaywallHost/> (mounted once in app/layout.tsx) shows the
 * plans modal with the same texts and the same "watch an ad" button
 * everywhere, then runs `retry` after a rewarded ad was granted.
 *
 * kinds:
 *  - "analysis"  — AI interpretation (diary, homepage Ask, inline prompts, quick symbol)
 *  - "save"      — saving a dream to the journal
 *  - "translate" — feed translation
 */
export type PaywallKind = "analysis" | "save" | "translate";

export type PaywallRequest = {
  kind: PaywallKind;
  /** Guest choice: sign in or earn another analysis through a rewarded ad. */
  guest?: { reason: "guest_limit" | "ip_limit"; signIn: () => void };
  /** analysis only: "daily" = today's free one is used, "limit" = all free ones are used. */
  reason?: "limit" | "daily";
  /** GA4 upgrade_prompt source. */
  source: string;
  /** Re-run the blocked action after the ad credit was granted. */
  retry?: () => void;
};

let listener: ((req: PaywallRequest) => void) | null = null;

export function openPaywall(req: PaywallRequest) {
  if (listener) listener(req);
  else if (typeof window !== "undefined") window.location.href = "/app/upgrade";
}

export function subscribePaywall(fn: (req: PaywallRequest) => void) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}
