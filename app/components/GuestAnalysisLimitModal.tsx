"use client";

import { useEffect, useRef, useState } from "react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { PaywallRequest } from "@/lib/paywall";
import { adUnlockUrl, setAdUnlockPending } from "@/lib/adUnlock";
import { trackEvent } from "@/lib/analytics";

/**
 * Guest choice: sign in, or watch a short ad. Same look as PlansModal — a grid of
 * choice cards (the ad card matches RewardedAdButton's card) with "Not now" below.
 * Picking the ad navigates to the Offerwall page (/ad/unlock); when the ad limit
 * is reached the ad card stays visible but disabled, with the reason under it.
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
    ? { title: pm.guestTranslateTitle, body: pm.guestTranslateBody, ad: pm.watchAdTranslate, again: pm.translateNow, signIn: pm.signInWithGoogle }
    : {
        title: pm.guestTitle,
        body: request.guest?.reason === "ip_limit" ? pm.guestNetworkBody : pm.guestBody,
        ad: pm.watchAd,
        again: t.common.interpret,
        signIn: t.common.signIn,
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
    if (ad !== "loading") signInRef.current?.focus();
  }, [ad]);

  function retry() {
    onClose();
    request.retry?.();
  }

  function watchAd() {
    trackEvent("rewarded_ad_open", { source: request.source, kind });
    // The retry closure dies with the navigation: useDreamAsk resumes the
    // interpretation from this sessionStorage mark when we come back.
    if (kind === "analysis") setAdUnlockPending({ kind: "analysis" });
    window.location.assign(adUnlockUrl(kind, undefined, request.translation));
  }

  if (ad === "loading") return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" role="status">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
        {pm.adLoading}
      </div>
    </div>
  );

  // Ad card: ready → Offerwall; credit already booked → run the action; limit/failed → disabled + reason.
  const adUsable = ad === "ready" || ad === "credit";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="guest-limit-title" aria-describedby="guest-limit-body"
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="guest-limit-title" className="text-lg font-semibold text-[var(--text)]">{copy.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={pm.notNow}
            className="rounded-full px-2 text-lg leading-none text-[var(--muted)] hover:text-[var(--text)]"
          >
            ×
          </button>
        </div>
        <p id="guest-limit-body" className="mt-2 text-sm text-[var(--muted)]">{copy.body}</p>

        <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{pm.chooseAccess}</div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Sign in — same card as a plan in PlansModal */}
          <button
            ref={signInRef}
            type="button"
            onClick={() => { onClose(); request.guest?.signIn(); }}
            className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-start transition hover:border-violet-400/60 hover:bg-violet-500/10"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-base font-semibold text-[var(--text)]">{copy.signIn}</span>
              <span className="text-lg font-semibold text-[var(--text)]">{t.pricing.free}</span>
            </span>
            <span className="mb-4 mt-1 text-sm text-[var(--muted)]">{pm.guestSignInCardDesc}</span>
            <span className="dream-primary-btn mt-auto w-full text-center text-sm">{copy.signIn}</span>
          </button>

          {/* Short ad — same highlighted card as RewardedAdButton's `card` mode */}
          <button
            type="button"
            disabled={!adUsable}
            onClick={ad === "credit" ? retry : watchAd}
            className={[
              "flex flex-col rounded-2xl border p-4 text-start transition",
              adUsable
                ? "border-violet-400/50 bg-violet-500/10 hover:border-violet-300 hover:bg-violet-500/15"
                : "cursor-not-allowed border-[var(--border)] bg-[var(--card)] opacity-60",
            ].join(" ")}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-base font-semibold text-[var(--text)]">{pm.adCardTitle}</span>
              <span className="text-lg font-semibold text-[var(--text)]">{t.pricing.free}</span>
            </span>
            <span className="mb-4 mt-1 text-sm text-[var(--muted)]">{copy.ad}</span>
            <span className="dream-primary-btn mt-auto w-full text-center text-sm">
              {ad === "credit" ? copy.again : `▶ ${pm.adCardCta}`}
            </span>
            {!adUsable ? (
              <span role="status" className="mt-2 text-xs text-[var(--muted)]">
                {ad === "limit" ? pm.adDailyLimit : pm.adUnavailable}
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" className="dream-btn dream-btn--neutral text-sm" onClick={onClose}>{pm.notNow}</button>
        </div>
      </div>
    </div>
  );
}
