"use client";

import { useEffect, useRef } from "react";
import { adMessages } from "@/lib/i18n/ads";
import type { Locale } from "@/lib/i18n/config";

const AD_CLIENT = "ca-pub-2484539106050736";
const ARTICLE_AD_SLOT = "7289632304";

/** The shared layout loads AdSense; each mounted article requests its banner once. */
export default function ArticleAdBanner({ locale, slot = ARTICLE_AD_SLOT }: { locale: Locale; slot?: string }) {
  const ad = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const preview = process.env.NODE_ENV !== "production";
  const configured = !!slot && /^\d+$/.test(slot);
  const m = adMessages[locale];

  useEffect(() => {
    if (preview || !configured) return;
    const element = ad.current;
    if (!element) return;
    function requestAd() {
      if (!element || requested.current || element.getBoundingClientRect().width <= 0) return;
      if (element.hasAttribute("data-adsbygoogle-status")) return;
      requested.current = true;
      try {
        const adsWindow = window as Window & { adsbygoogle?: Record<string, never>[] };
        (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({});
      } catch {
        // A blocked or unavailable ad must not interrupt the article.
      }
    }
    requestAd();
    const observer = new ResizeObserver(requestAd);
    observer.observe(element);
    return () => observer.disconnect();
  }, [configured, preview, slot]);

  if (!preview && !configured) return null;

  return (
    <aside aria-label={m.label} data-article-ad="after-first-paragraph" className="not-prose my-6 w-full min-w-0">
      <p className="mb-2 text-center text-[10px] font-normal uppercase leading-4 tracking-widest text-[var(--dd-subtle)]">{m.label}</p>
      {preview ? (
        <div className="flex min-h-[100px] w-full items-center justify-center rounded-xl border border-dashed border-[var(--dd-border-strong)] bg-[var(--dd-surface-soft)] px-4 text-center text-sm text-[var(--dd-muted)] sm:min-h-[90px]">
          {m.preview}
        </div>
      ) : (
        <ins ref={ad} className="adsbygoogle" style={{ display: "block", width: "100%", minHeight: 90 }}
          data-ad-client={AD_CLIENT} data-ad-slot={slot} data-ad-format="horizontal" data-full-width-responsive="false" />
      )}
    </aside>
  );
}
