"use client";

import { useEffect, useRef, useState } from "react";

import { adUnlockUrl } from "@/lib/adUnlock";
import { createRewardedAd, type RewardedState } from "@/lib/rewardedAd";
import { trackEvent } from "@/lib/analytics";
import type { PaywallKind } from "@/lib/paywall";

type Props = {
  label: string;
  /**
   * What the ad pays for. When Google Ad Manager has no fill for the GPT
   * rewarded slot, the button falls back to the AdSense Offerwall page
   * (/ad/unlock, see lib/adUnlock.ts) for this kind.
   */
  kind: PaywallKind;
  translation?: { sharedDreamId: string; targetLang: string };
  /** Keep the guest ad option visible and explain loading/no-fill/failure. */
  statusCopy?: { loading: string; unavailable: string; failed: string };
  /**
   * Called after Google reports the reward (ad watched long enough). Should
   * ask the server for the credit; resolve true when it was granted.
   */
  onGranted: (rewardId: string) => Promise<boolean>;
  /** Called after the ad closes and the reward was granted. */
  onDone: () => void;
  source: string;
  /** Render the same opt-in button as a choice beside the subscription plans. */
  card?: { title: string; price: string; description: string };
};

/**
 * "Watch an ad → get one more interpretation" via a Google Ad Manager
 * rewarded ad (GPT OutOfPageFormat.REWARDED). Requests after opt-in, then
 * shows when Google reports ready. Dialogs supply localized statusCopy for loading,
 * no fill and failures.
 */
export default function RewardedAdButton({ label, kind, translation, onGranted, onDone, source, statusCopy, card }: Props) {
  const [status, setStatus] = useState<RewardedState | "idle">("idle");
  const [requested, setRequested] = useState(false);
  const sessionRef = useRef<ReturnType<typeof createRewardedAd> | null>(null);
  const cbRef = useRef({ onGranted, onDone });
  useEffect(() => { cbRef.current = { onGranted, onDone }; }, [onGranted, onDone]);

  useEffect(() => {
    if (!requested) return;
    const session = createRewardedAd({
      showWhenReady: true,
      onState: setStatus,
      onGranted: (rewardId) => {
        const pending = cbRef.current.onGranted(rewardId);
        trackEvent("rewarded_ad_granted", { source });
        return pending;
      },
      onDone: () => cbRef.current.onDone(),
    });
    sessionRef.current = session;
    return () => {
      sessionRef.current = null;
      session.dispose();
    };
  }, [source, requested]);

  // GPT had nothing to show (this network has no line items / Ad Exchange for
  // the rewarded slot): continue on the AdSense Offerwall page instead.
  // Full navigation on purpose: the Offerwall is rendered by the AdSense tag
  // on page load only, a client-side route change would not trigger it (and
  // would leave this modal on screen).
  useEffect(() => {
    if (status !== "unavailable") return;
    trackEvent("rewarded_ad_fallback", { source, kind });
    window.location.assign(adUnlockUrl(kind, undefined, translation));
  }, [status, source, kind, translation]);

  const ready = status === "idle" || status === "ready" || status === "busy" || status === "unavailable";
  const start = () => {
    if (status === "idle") { setStatus("loading"); setRequested(true); return; }
    if (sessionRef.current?.show()) trackEvent("rewarded_ad_open", { source });
  };
  if (card) {
    const statusText = status === "loading" ? statusCopy?.loading
      : status === "unavailable" ? statusCopy?.unavailable
        : status === "failed" ? statusCopy?.failed : null;
    return (
      <button
        type="button"
        disabled={!ready || status === "busy" || status === "unavailable"}
        onClick={start}
        className="flex flex-col rounded-2xl border border-violet-400/50 bg-violet-500/10 p-4 text-start transition hover:border-violet-300 hover:bg-violet-500/15 disabled:opacity-70 sm:col-span-2 md:col-span-1"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold text-[var(--text)]">{card.title}</span>
          <span className="text-lg font-semibold text-[var(--text)]">{card.price}</span>
        </span>
        <span className="mt-1 text-sm text-[var(--muted)]">{card.description}</span>
        {statusText ? <span role="status" className="mt-2 text-xs text-[var(--muted)]">{statusText}</span> : null}
        <span className="dream-primary-btn mt-auto w-full text-center text-sm">▶ {label}</span>
      </button>
    );
  }
  if (!ready) {
    if (!statusCopy) return null;
    return (
      <div className="mt-3">
        <button type="button" disabled className="dream-btn dream-btn--neutral w-full text-sm opacity-60">
          ▶ {label}
        </button>
        <p role="status" className="mt-2 text-sm text-[var(--muted)]">{statusCopy[status]}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={status === "busy" || status === "unavailable"}
      onClick={start}
      className="dream-btn dream-btn--neutral mt-3 w-full text-sm"
    >
      ▶ {label}
    </button>
  );
}
