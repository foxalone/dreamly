"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { loadAyetPlayer, playAyetRewarded, type AyetAdConfig } from "@/lib/ayetRewardedVideo";
import type { Locale } from "@/lib/i18n/config";
import { offerwallEntitlement } from "@/lib/offerwallSession";
import { offerwallVisible } from "@/lib/offerwallVisibility";

export type FeaturedFallbackOutcome = "google-shown" | "google-complete" | "unavailable" | "unlocked";

function requestReward(body: object, signal: AbortSignal) {
  return fetch("/api/featured-horoscope/ayet", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
  });
}

async function confirmReward(reward: unknown, signal: AbortSignal) {
  const body = { action: "complete", reward };
  const response = await requestReward(body, signal).catch(error => {
    if (signal.aborted) throw error;
    return null;
  });
  // Retrying the signed receipt recovers a lost response without extending access.
  return !response || response.status >= 500 ? requestReward(body, signal) : response;
}

export default function FeaturedAyetFallback({ challenge, locale, title, cancelLabel, onOutcome }: {
  challenge: string;
  locale: Locale;
  title: string;
  cancelLabel: string;
  onOutcome: (outcome: FeaturedFallbackOutcome) => void;
}) {
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const analytics = { feature: "featured_forecast", provider: "ayet", locale };

    function finish(outcome: FeaturedFallbackOutcome) {
      if (signal.aborted) return;
      controller.abort();
      onOutcome(outcome);
    }

    function checkGoogle() {
      if (offerwallVisible()) finish("google-shown");
      else if (offerwallEntitlement(document.cookie)) finish("google-complete");
    }

    cancelRef.current = () => finish("unavailable");
    const observer = new MutationObserver(checkGoogle);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    // During the fallback, a late Google overlay still takes priority.
    const interval = setInterval(checkGoogle, 300);

    void Promise.resolve().then(async () => {
      checkGoogle();
      if (signal.aborted) return;
      const start = await requestReward({ action: "start", challenge }, signal);
      if (start.status === 409) {
        const { code } = await start.json();
        if (code === "GOOGLE_ENTITLED") return finish("google-complete");
        if (code === "ALREADY_UNLOCKED") return finish("unlocked");
      }
      if (!start.ok) return finish("unavailable");
      const config = await start.json() as AyetAdConfig;
      const player = await loadAyetPlayer(signal, { title, cancelLabel, onCancel: cancelRef.current });
      trackEvent("rewarded_video_fallback", analytics);
      const reward = await playAyetRewarded(player.sdk, config, signal, player.show).finally(player.close);
      checkGoogle();
      if (signal.aborted) return;
      const confirmation = await confirmReward(reward, signal);
      if (!confirmation.ok) return finish("unavailable");
      trackEvent("rewarded_video_confirmed", analytics);
      trackEvent("rewarded_feature_unlocked", analytics);
      finish("unlocked");
    }).catch(() => finish("unavailable"));

    return () => { controller.abort(); observer.disconnect(); clearInterval(interval); };
  }, [challenge, title, cancelLabel, locale, onOutcome]);

  return <button type="button" className="dream-btn dream-btn--neutral mt-5 w-full" onClick={() => cancelRef.current()}>{cancelLabel}</button>;
}
