"use client";

import { useEffect, useRef, useState } from "react";

import { REWARDED_AD_UNIT_PATH } from "@/lib/subscriptions/plans";
import { trackEvent } from "@/lib/analytics";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    googletag?: any;
  }
}

const GPT_SRC = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
// Give up if Google has no rewarded ad for this visitor within this time.
const READY_TIMEOUT_MS = 10_000;

let gptPromise: Promise<void> | null = null;

function loadGpt(): Promise<void> {
  if (gptPromise) return gptPromise;
  gptPromise = new Promise<void>((resolve, reject) => {
    window.googletag = window.googletag || { cmd: [] };
    if (document.querySelector(`script[src="${GPT_SRC}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = GPT_SRC;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => {
      gptPromise = null;
      reject(new Error("gpt load failed"));
    };
    document.head.appendChild(s);
  });
  return gptPromise;
}

type Props = {
  label: string;
  /**
   * Called after Google reports the reward (ad watched long enough). Should
   * ask the server for the credit; resolve true when it was granted.
   */
  onGranted: () => Promise<boolean>;
  /** Called after the ad closes and the reward was granted. */
  onDone: () => void;
  source: string;
};

/**
 * "Watch an ad → get one more interpretation" via a Google Ad Manager
 * rewarded ad (GPT OutOfPageFormat.REWARDED). Renders nothing until Google
 * actually has an ad ready, so visitors with no fill (e.g. from Russia, ad
 * blockers, desktop pages GPT refuses) never see a dead button.
 */
export default function RewardedAdButton({ label, onGranted, onDone, source }: Props) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const showRef = useRef<null | (() => void)>(null);
  const grantedRef = useRef(false);
  const cbRef = useRef({ onGranted, onDone });
  cbRef.current = { onGranted, onDone };

  useEffect(() => {
    let cancelled = false;
    let slot: any = null;
    const listeners: Array<[string, (e: any) => void]> = [];
    const timer = window.setTimeout(() => {
      if (!showRef.current) cancelled = true;
    }, READY_TIMEOUT_MS);

    loadGpt()
      .then(() => {
        const gt = window.googletag;
        gt.cmd.push(() => {
          if (cancelled) return;
          slot = gt.defineOutOfPageSlot(REWARDED_AD_UNIT_PATH, gt.enums.OutOfPageFormat.REWARDED);
          // null = this page / device is not eligible for rewarded ads.
          if (!slot) return;
          slot.addService(gt.pubads());

          const on = (type: string, fn: (e: any) => void) => {
            const wrapped = (e: any) => {
              if (e.slot === slot) fn(e);
            };
            gt.pubads().addEventListener(type, wrapped);
            listeners.push([type, wrapped]);
          };

          on("rewardedSlotReady", (e) => {
            if (cancelled) return;
            showRef.current = () => e.makeRewardedVisible();
            setReady(true);
          });
          on("slotRenderEnded", (e) => {
            if (e.isEmpty) setReady(false);
          });
          on("rewardedSlotGranted", () => {
            grantedRef.current = true;
            trackEvent("rewarded_ad_granted", { source });
          });
          on("rewardedSlotClosed", async () => {
            const g = window.googletag;
            if (slot) g.destroySlots([slot]);
            slot = null;
            setReady(false);
            if (!grantedRef.current) {
              setBusy(false);
              return;
            }
            const ok = await cbRef.current.onGranted().catch(() => false);
            setBusy(false);
            if (ok) cbRef.current.onDone();
          });

          gt.enableServices();
          gt.display(slot);
        });
      })
      .catch(() => {
        /* ad blocker or network — just no button */
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      const gt = window.googletag;
      if (gt?.pubads && listeners.length) {
        for (const [type, fn] of listeners) gt.pubads().removeEventListener(type, fn);
      }
      if (slot && gt?.destroySlots) gt.destroySlots([slot]);
    };
  }, [source]);

  if (!ready) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!showRef.current) return;
        setBusy(true);
        trackEvent("rewarded_ad_open", { source });
        showRef.current();
        showRef.current = null;
      }}
      className="dream-btn dream-btn--neutral mt-3 w-full text-sm"
    >
      ▶ {label}
    </button>
  );
}
