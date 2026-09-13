"use client";

import { useEffect } from "react";

export function isAdminJobActive(status?: string | null) {
  return status === "queued" || status === "processing";
}

/** Poll only while work is in flight. Studio panels pause in a hidden tab. */
export function useAdminActivePolling(
  enabled: boolean,
  tick: () => void,
  intervalMs: number,
  options?: { pauseWhenHidden?: boolean },
) {
  const pauseWhenHidden = options?.pauseWhenHidden !== false;

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      if (pauseWhenHidden && document.visibilityState === "hidden") return;
      tick();
    };

    const timer = window.setInterval(run, intervalMs);
    if (pauseWhenHidden) document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(timer);
      if (pauseWhenHidden) document.removeEventListener("visibilitychange", run);
    };
  }, [enabled, intervalMs, pauseWhenHidden, tick]);
}
