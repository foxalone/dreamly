"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { yourfitPromoCopy } from "@/lib/i18n/yourfitPromo";
import { trackEvent } from "@/lib/analytics";
import { reportAnalysisAttempt } from "@/lib/reportAnalysisAttempt";

export default function YourFitPromo({ attemptId, kind = "analysis", targetKey = "" }: { attemptId?: string; kind?: "analysis" | "translate" | "reading"; targetKey?: string }) {
  const locale = useLocale();
  const copy = yourfitPromoCopy[locale];
  const element = useRef<HTMLElement>(null);
  const reported = useRef(false);
  const campaign = `first_${kind}_no_ad`;
  const placement = kind === "analysis" ? "guest_dream_result" : `guest_${kind}_result`;
  const params = { campaign, placement, language: locale };
  const href = `https://yourfit.space/dashboard?utm_source=dreamly&utm_medium=house_ad&utm_campaign=${campaign}&utm_content=${placement}_${locale}`;

  useEffect(() => {
    if (!element.current) return;
    let visible = false;
    const report = () => {
      if (!visible || document.visibilityState !== "visible" || reported.current) return;
      reported.current = true;
      // Persist across React remounts and reloads without making storage a prerequisite.
      try {
        const key = `dreamly:yourfit-impression:${attemptId ?? `${kind}:${targetKey}`}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
      } catch { /* The server also deduplicates impressions. */ }
      if (attemptId) reportAnalysisAttempt("yourfit_promo_impression", undefined, attemptId);
      trackEvent("yourfit_promo_impression", { campaign, placement, language: locale });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      report();
    }, { threshold: 0.5 });
    observer.observe(element.current);
    document.addEventListener("visibilitychange", report);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", report); };
  }, [attemptId, locale, campaign, placement, kind, targetKey]);

  return (
    <aside ref={element} dir={locale === "ar" ? "rtl" : "ltr"} aria-label={`${copy.label} · YourFit`}
      className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(80px,32%)] gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-[var(--text)]">
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted)]">{copy.label}</p>
        <p className="font-semibold">YourFit</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{copy.body}</p>
        <a href={href} target="_blank" rel="noopener noreferrer" className="dream-btn dream-btn--neutral mt-2 inline-flex min-h-11 max-w-full items-center gap-1 text-sm"
          onClick={() => {
            if (attemptId) reportAnalysisAttempt("yourfit_promo_click", undefined, attemptId);
            trackEvent("yourfit_promo_click", params);
          }}>
          {copy.cta}<span aria-hidden="true">↗</span>
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/yourfit-training-promo.webp" alt="" width={320} height={480}
        className="h-36 w-full rounded-xl object-cover object-top" loading="lazy" />
    </aside>
  );
}
