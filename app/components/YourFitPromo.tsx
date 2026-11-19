"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n/config";
import { yourfitPromoCopy } from "@/lib/i18n/yourfitPromo";
import { trackEvent } from "@/lib/analytics";
import { auth } from "@/lib/firebase";
import { reportAnalysisAttempt } from "@/lib/reportAnalysisAttempt";
import { visibleCountdown } from "@/lib/visibleCountdown";

const subscribe = () => () => {};
const DURATION_MS = 5000;

function reportPromo(event: "yourfit_promo_impression" | "yourfit_promo_click", attemptId?: string) {
  if (!attemptId) return;
  void (async () => {
    const token = await auth.currentUser?.getIdToken().catch(() => undefined);
    reportAnalysisAttempt(event, undefined, attemptId, token);
  })().catch(() => {});
}

export default function YourFitPromo({ attemptId, kind, targetKey, audience, locale, onClose, busy = false, error, unlocksAnalysis = true }: {
  attemptId?: string; kind: "analysis" | "translate" | "reading"; targetKey: string;
  audience: "guest" | "account"; locale: Locale; onClose: () => void; busy?: boolean; error?: string; unlocksAnalysis?: boolean;
}) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const copy = yourfitPromoCopy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const campaign = unlocksAnalysis ? `first_${kind}_no_ad` : "analysis_no_ad";
  const placement = kind === "analysis" ? `${audience}_dream_result` : `${audience}_${kind}_result`;
  const params = { campaign, placement, language: locale, format: "interstitial" };
  const identity = attemptId ?? `${kind}:${targetKey}`;
  const href = `https://yourfit.space/dashboard?utm_source=dreamly&utm_medium=house_ad&utm_campaign=${campaign}&utm_content=${placement}_${locale}`;

  useEffect(() => {
    const element = dialog.current;
    if (!mounted || !element) return;
    elapsedRef.current = 0;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    // This dialog runs on /ad/unlock; no result is mounted or requested yet.
    element.dataset.yourfitOverlay = "true";
    const tick = visibleCountdown(DURATION_MS);
    let frame = 0;
    let impressed = false;
    let completed = false;
    const update = () => {
      const visible = document.visibilityState === "visible" && element.open;
      const value = tick(performance.now(), visible);
      elapsedRef.current = value;
      setElapsed(value);
      if (visible && !impressed) {
        impressed = true;
        let first = true;
        try {
          const key = `dreamly:yourfit-overlay-impression:${identity}`;
          first = !localStorage.getItem(key);
          localStorage.setItem(key, "1");
        } catch { /* The server also deduplicates analysis impressions. */ }
        if (first) {
          reportPromo("yourfit_promo_impression", attemptId);
          trackEvent("yourfit_promo_impression", { campaign, placement, language: locale, format: "interstitial" });
        }
      }
      if (value >= DURATION_MS && !completed) {
        completed = true;
        trackEvent("yourfit_promo_completed", { campaign, placement, language: locale, format: "interstitial", visible_seconds: 5 });
      }
    };
    const animate = () => {
      update();
      if (elapsedRef.current < DURATION_MS && element.open) frame = requestAnimationFrame(animate);
    };
    const release = () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = oldOverflow;
      delete element.dataset.yourfitOverlay;
      window.dispatchEvent(new Event("yourfit-promo-closed"));
      previousFocus?.focus({ preventScroll: true });
    };
    frame = requestAnimationFrame(animate);
    document.addEventListener("visibilitychange", update);
    element.addEventListener("close", release);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", update);
      element.removeEventListener("close", release);
      element.close();
      release();
    };
  }, [mounted, identity, attemptId, campaign, placement, locale]);

  const close = () => {
    if (elapsedRef.current < DURATION_MS || !dialog.current?.open || busy) return;
    trackEvent("yourfit_promo_close_clicked", { ...params, visible_seconds: 5 });
    // The parent grants access and navigates only after this explicit X click.
    // Keep the dialog present during the request, and allow a retry on failure.
    onClose();
  };
  const seconds = Math.max(0, Math.ceil((DURATION_MS - elapsed) / 1000));
  const closeLabel = seconds ? copy.countdown.replace("{seconds}", String(seconds)) : copy.close;
  if (!mounted) return null;

  return createPortal(
    <dialog ref={dialog} dir={locale === "ar" ? "rtl" : "ltr"} aria-label={`${copy.label} · YourFit`}
      onCancel={(event) => { event.preventDefault(); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); } }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--text)] shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <p className="text-sm text-[var(--muted)]">{copy.label} · YourFit</p>
        <button type="button" disabled={seconds > 0 || busy} onClick={close} aria-label={closeLabel} title={closeLabel}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] disabled:cursor-default">
          {seconds > 0 ? <>
            <svg viewBox="0 0 44 44" className="absolute inset-0 size-11 -rotate-90" aria-hidden="true">
              <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" strokeWidth="2" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - elapsed / DURATION_MS)} />
            </svg>
            <span aria-hidden="true">{seconds}</span>
          </> : <span aria-hidden="true">✕</span>}
        </button>
      </div>
      {error ? <p role="alert" className="px-4 pt-2 text-sm text-red-500 sm:px-6">{error}</p> : null}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(100px,40%)] items-center gap-4 p-4 sm:gap-6 sm:p-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold sm:text-3xl">YourFit</h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--muted)] sm:text-lg">{copy.body}</p>
          <a href={href} target="_blank" rel="noopener noreferrer" className="dream-btn dream-btn--neutral mt-5 inline-flex min-h-11 max-w-full items-center gap-1 text-sm"
            onClick={() => { reportPromo("yourfit_promo_click", attemptId); trackEvent("yourfit_promo_click", params); }}>
            {copy.cta}<span aria-hidden="true">↗</span>
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/yourfit-training-promo.webp" alt="" width={320} height={480}
          className="h-[min(48dvh,320px)] min-h-32 w-full rounded-2xl object-cover object-top" />
      </div>
    </dialog>, document.body,
  );
}
