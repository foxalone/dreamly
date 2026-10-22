"use client";

import { useEffect, useRef } from "react";
import { adMessages } from "@/lib/i18n/ads";
import type { Locale } from "@/lib/i18n/config";
import styles from "./AdBanner.module.css";

const AD_CLIENT = "ca-pub-2484539106050736";
const ARTICLE_AD_SLOT = "7289632304";

/** The shared layout loads AdSense; each mounted placement requests its ad once. */
export default function ArticleAdBanner({ locale, slot = ARTICLE_AD_SLOT, variant = "banner" }: { locale: Locale; slot?: string; variant?: "banner" | "card" | "gallery" | "map" | "feed" }) {
  const ad = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const preview = process.env.NODE_ENV !== "production";
  const configured = !!slot && /^\d+$/.test(slot);
  const m = adMessages[locale];
  const card = variant === "card" || variant === "gallery";
  const gallery = variant === "gallery";
  const map = variant === "map";
  const feed = variant === "feed";

  useEffect(() => {
    if (preview || !configured) return;
    const element = ad.current;
    if (!element) return;
    let visible = !feed || typeof IntersectionObserver === "undefined";
    function requestAd() {
      if (!element || !visible || requested.current || element.getBoundingClientRect().width <= 0) return;
      if (element.hasAttribute("data-adsbygoogle-status")) return;
      requested.current = true;
      try {
        const adsWindow = window as Window & { adsbygoogle?: Record<string, never>[] };
        (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({});
      } catch {
        // A blocked or unavailable ad must not interrupt the page.
      }
    }
    requestAd();
    const observer = new ResizeObserver(requestAd);
    observer.observe(element);
    const intersection = feed && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        requestAd();
      }, { rootMargin: "200px" })
      : null;
    intersection?.observe(element);
    return () => {
      observer.disconnect();
      intersection?.disconnect();
    };
  }, [configured, feed, preview, slot]);

  if (!preview && !configured) return null;

  return (
    <aside aria-label={m.label} data-article-ad={feed ? "feed-banner" : map ? "map-banner" : gallery ? "gallery-card" : card ? "guide-card" : "after-first-paragraph"} className={feed
      ? "not-prose w-full min-w-0 py-2"
      : map
      ? "not-prose w-full min-w-0"
      : gallery
      ? "not-prose flex aspect-[2/3] w-full min-w-0 flex-col self-start rounded-[1.15rem] bg-[var(--dd-surface-soft)] p-3 ring-1 ring-[var(--dd-border)] sm:rounded-[1.35rem] sm:p-5"
      : card ? "not-prose flex min-h-[160px] w-full min-w-0 flex-col rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5"
      : "not-prose my-6 w-full min-w-0"}>
      <p className="mb-2 text-center text-[10px] font-normal uppercase leading-4 tracking-widest text-[var(--dd-subtle)]">{m.label}</p>
      {preview ? (
        <div className={`flex w-full items-center justify-center rounded-xl border border-dashed border-[var(--dd-border-strong)] bg-[var(--dd-surface-soft)] px-4 text-center text-sm text-[var(--dd-muted)] ${feed ? styles.feedAd : map ? styles.mapAd : card ? "min-h-[100px] flex-1" : "min-h-[100px] sm:min-h-[90px]"}`}>
          {m.preview}
        </div>
      ) : (
        <ins ref={ad} className={`adsbygoogle${gallery ? " min-h-0 flex-1" : feed ? ` ${styles.feedAd}` : map ? ` ${styles.mapAd}` : ""}`} style={{ display: "block", width: "100%", minHeight: gallery || map || feed ? undefined : card ? 100 : 90 }}
          data-ad-client={AD_CLIENT} data-ad-slot={slot} data-ad-format={map || feed ? undefined : gallery ? "vertical" : card ? "auto" : "horizontal"} data-full-width-responsive="false" />
      )}
    </aside>
  );
}
