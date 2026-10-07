"use client";

import { useEffect, useRef, useState } from "react";

import { createRewardedAd, type RewardedState } from "@/lib/rewardedAd";
import { trackEvent } from "@/lib/analytics";

type Props = {
  label: string;
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
};

/**
 * "Watch an ad → get one more interpretation" via a Google Ad Manager
 * rewarded ad (GPT OutOfPageFormat.REWARDED). Requests after opt-in, then
 * shows when Google reports ready. Dialogs supply localized statusCopy for loading,
 * no fill and failures.
 */
export default function RewardedAdButton({ label, onGranted, onDone, source, statusCopy }: Props) {
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

  const ready = status === "idle" || status === "ready" || status === "busy";
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
      disabled={status === "busy"}
      onClick={() => {
        if (status === "idle") { setStatus("loading"); setRequested(true); return; }
        if (sessionRef.current?.show()) trackEvent("rewarded_ad_open", { source });
      }}
      className="dream-btn dream-btn--neutral mt-3 w-full text-sm"
    >
      ▶ {label}
    </button>
  );
}
