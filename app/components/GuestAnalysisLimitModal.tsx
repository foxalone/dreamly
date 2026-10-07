"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { PaywallRequest } from "@/lib/paywall";
import RewardedAdButton from "./RewardedAdButton";

export default function GuestAnalysisLimitModal({ request, onClose }: {
  request: PaywallRequest;
  onClose: () => void;
}) {
  const t = useMessages();
  const pm = t.plansModal;
  const [ad, setAd] = useState<"loading" | "ready" | "credit" | "limit" | "failed">("loading");
  const closeRef = useRef(onClose);
  const signInRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const previousFocus = document.activeElement as HTMLElement | null;
    signInRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    void fetch("/api/dreams/guest-ad-reward", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("ad status failed");
        const data = await res.json();
        if (!cancelled) setAd(data.credits > 0 ? "credit" : data.leftToday > 0 ? "ready" : "limit");
      })
      .catch(() => { if (!cancelled) setAd("failed"); });
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, []);

  function retry() {
    onClose();
    request.retry?.();
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="guest-limit-title" aria-describedby="guest-limit-body"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <h2 id="guest-limit-title" className="text-lg font-semibold">{pm.guestTitle}</h2>
        <p id="guest-limit-body" className="mt-2 text-sm text-[var(--muted)]">
          {request.guest?.reason === "ip_limit" ? pm.guestNetworkBody : pm.guestBody}
        </p>
        <button ref={signInRef} type="button" className="dream-primary-btn mt-5 w-full"
          onClick={() => { onClose(); request.guest?.signIn(); }}>{t.common.signIn}</button>
        {ad === "ready" ? (
          <RewardedAdButton label={pm.watchAd} source={request.source}
            statusCopy={{ loading: pm.adLoading, unavailable: pm.adUnavailable, failed: pm.adFailed }}
            onGranted={async (rewardId) => {
              const res = await fetch("/api/dreams/guest-ad-reward", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardId }) });
              return res.ok;
            }}
            onDone={retry} />
        ) : ad === "credit" ? (
          <button type="button" className="dream-btn dream-btn--neutral mt-3 w-full" onClick={retry}>{t.common.interpret}</button>
        ) : (
          <div className="mt-3">
            <button type="button" disabled className="dream-btn dream-btn--neutral w-full text-sm opacity-60">▶ {pm.watchAd}</button>
            <p role="status" className="mt-2 text-sm text-[var(--muted)]">
              {ad === "loading" ? pm.adLoading : ad === "limit" ? pm.adDailyLimit : pm.adUnavailable}
            </p>
          </div>
        )}
        <button type="button" className="dream-btn dream-btn--neutral mt-4 w-full text-sm" onClick={onClose}>{pm.notNow}</button>
      </div>
    </div>
  );
}
