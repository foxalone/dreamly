"use client";

import { adUnlockUrl } from "@/lib/adUnlock";
import { trackEvent } from "@/lib/analytics";
import type { PaywallKind } from "@/lib/paywall";

type Props = {
  label: string;
  /** What the ad pays for; /ad/unlock books it after the Offerwall closes. */
  kind: PaywallKind;
  translation?: { sharedDreamId: string; targetLang: string };
  source: string;
  /** Render as a choice card beside the subscription plans. */
  card?: { title: string; price: string; description: string };
};

/**
 * "Watch an ad → unlock this action" via the AdSense Offerwall. The click
 * navigates straight to /ad/unlock, which shows the ad, books the reward
 * (same /ad-reward routes) and returns to `next`; the caller resumes the
 * pending action from sessionStorage (lib/adUnlock.ts).
 *
 * Full navigation on purpose: the Offerwall is rendered by the AdSense tag on
 * page load only — a client-side route change would not trigger it. The old
 * GPT rewarded slot was dropped from this path: GAM answered "no fill" every
 * time (no line items / Ad Exchange), so it only added a "looking for an
 * ad…" wait before the same fallback (lib/rewardedAd.ts still has the code).
 */
export default function RewardedAdButton({ label, kind, translation, source, card }: Props) {
  const start = () => {
    trackEvent("rewarded_ad_open", { source, kind });
    window.location.assign(adUnlockUrl(kind, undefined, translation));
  };
  if (card) {
    return (
      <button
        type="button"
        onClick={start}
        className="flex flex-col rounded-2xl border border-violet-400/50 bg-violet-500/10 p-4 text-start transition hover:border-violet-300 hover:bg-violet-500/15 sm:col-span-2 md:col-span-1"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold text-[var(--text)]">{card.title}</span>
          <span className="text-lg font-semibold text-[var(--text)]">{card.price}</span>
        </span>
        <span className="mb-4 mt-1 text-sm text-[var(--muted)]">{card.description}</span>
        <span className="dream-primary-btn mt-auto w-full text-center text-sm">▶ {label}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={start} className="dream-btn dream-btn--neutral mt-3 w-full text-sm">
      ▶ {label}
    </button>
  );
}
