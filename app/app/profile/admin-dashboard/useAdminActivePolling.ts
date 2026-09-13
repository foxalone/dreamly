"use client";

import { useEffect, useRef } from "react";
import { startAdminPolling } from "@/lib/adminPolling";

export function isAdminJobActive(status?: string | null) {
  return status === "queued" || status === "processing";
}

/** Poll only while work is in flight. Studio panels pause in a hidden tab. */
export function useAdminActivePolling(
  enabled: boolean,
  tick: () => void | Promise<unknown>,
  intervalMs: number,
  options?: { pauseWhenHidden?: boolean },
) {
  const pauseWhenHidden = options?.pauseWhenHidden !== false;
  const tickRef = useRef(tick);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  useEffect(() => {
    if (!enabled) return;

    return startAdminPolling(() => tickRef.current(), intervalMs, pauseWhenHidden);
  }, [enabled, intervalMs, pauseWhenHidden]);
}
