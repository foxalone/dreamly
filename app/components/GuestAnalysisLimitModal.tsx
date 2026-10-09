"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { PaywallRequest } from "@/lib/paywall";
import { adUnlockUrl } from "@/lib/adUnlock";

/**
 * Send eligible guests to the Offerwall directly, so Google's ad choice is
 * their first click. If the ad limit is reached, show the sign-in choice.
 */
export default function GuestAnalysisLimitModal({ request, onClose }: {
  request: PaywallRequest;
  onClose: () => void;
}) {
  const t = useMessages();
  const pm = t.plansModal;
  const translate = request.kind === "translate";
  const kind = translate ? "translate" : "analysis";
  const copy = translate
    ? { title: pm.guestTranslateTitle, body: pm.guestTranslateBody, ad: pm.watchAdTranslate, again: pm.translateNow }
    : {
        title: pm.guestTitle,
        body: request.guest?.reason === "ip_limit" ? pm.guestNetworkBody : pm.guestBody,
        ad: pm.watchAd,
        again: t.common.interpret,
      };
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
    const params = new URLSearchParams({ kind, ...(request.translation ?? {}) });
    void fetch(`/api/dreams/guest-ad-reward?${params}`, { credentials: "same-origin", cache: "no-store" })
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
  }, [kind, request.translation]);

  useEffect(() => {
    if (ad === "ready") window.location.assign(adUnlockUrl(kind, undefined, request.translation));
  }, [ad, kind, request.translation]);

  useEffect(() => {
    if (ad !== "loading" && ad !== "ready") signInRef.current?.focus();
  }, [ad]);

  function retry() {
    onClose();
    request.retry?.();
  }

  if (ad === "loading" || ad === "ready") return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" role="status">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
        {pm.adLoading}
      </div>
    </div>
  );

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
        <h2 id="guest-limit-title" className="text-lg font-semibold">{copy.title}</h2>
        <p id="guest-limit-body" className="mt-2 text-sm text-[var(--muted)]">{copy.body}</p>
        <button ref={signInRef} type="button" className="dream-primary-btn mt-5 w-full"
          onClick={() => { onClose(); request.guest?.signIn(); }}>{translate ? pm.signInWithGoogle : t.common.signIn}</button>
        {ad === "credit" ? (
          <button type="button" className="dream-btn dream-btn--neutral mt-3 w-full" onClick={retry}>{copy.again}</button>
        ) : (
          <div className="mt-3">
            <button type="button" disabled className="dream-btn dream-btn--neutral w-full text-sm opacity-60">▶ {copy.ad}</button>
            <p role="status" className="mt-2 text-sm text-[var(--muted)]">
              {ad === "limit" ? pm.adDailyLimit : pm.adUnavailable}
            </p>
          </div>
        )}
        <button type="button" className="dream-btn dream-btn--neutral mt-4 w-full text-sm" onClick={onClose}>{pm.notNow}</button>
      </div>
    </div>
  );
}
