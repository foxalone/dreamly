"use client";

import { useEffect, useRef, useState } from "react";
import { adMessages } from "@/lib/i18n/ads";
import type { Locale } from "@/lib/i18n/config";
import styles from "./AdBanner.module.css";

const AD_CLIENT = "ca-pub-2484539106050736";
const ARTICLE_AD_SLOT = "7289632304";

/** The shared layout loads AdSense; each mounted placement requests its ad once. */
export default function ArticleAdBanner({ locale, slot = ARTICLE_AD_SLOT, variant = "banner" }: { locale: Locale; slot?: string; variant?: "banner" | "card" | "gallery" | "map" | "feed" | "home-feature" | "home-symbol" | "zodiac" }) {
  const ad = useRef<HTMLModElement>(null);
  const cardBox = useRef<HTMLElement>(null);
  const cardSlot = useRef<HTMLDivElement>(null);
  const [cardLayout, setCardLayout] = useState<{ ready: boolean; minHeight?: number }>({ ready: false });
  const requested = useRef(false);
  const preview = process.env.NODE_ENV !== "production";
  const configured = !!slot && /^\d+$/.test(slot);
  const m = adMessages[locale];
  const card = variant === "card" || variant === "gallery";
  const gallery = variant === "gallery";
  const map = variant === "map";
  const feed = variant === "feed";
  const homeCard = variant === "home-feature" || variant === "home-symbol";
  const zodiac = variant === "zodiac";
  const lazy = feed || homeCard || zodiac;
  const compactCard = variant === "home-symbol" || zodiac;
  const gridCard = variant === "card" || homeCard || zodiac;

  useEffect(() => {
    if (!gridCard) return;
    const box = cardBox.current;
    const grid = box?.parentElement;
    if (!box || !grid) return;
    // Content cards set the row height. A row containing only an ad uses the
    // preceding content card, including the final row in a multi-column grid.
    const siblings = Array.from(grid.children).filter((item) => !item.hasAttribute("data-article-ad"));
    const previous = siblings.filter((item) => item.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1) ?? siblings[0];
    function measure() {
      const columns = getComputedStyle(grid!).gridTemplateColumns.trim().split(/\s+/).length;
      const children = Array.from(grid!.children);
      const rowStart = Math.floor(children.indexOf(box!) / columns) * columns;
      const hasContentPeer = children.slice(rowStart, rowStart + columns).some((item) => !item.hasAttribute("data-article-ad"));
      const minHeight = !hasContentPeer ? previous?.getBoundingClientRect().height || 160 : undefined;
      setCardLayout((before) => before.ready && before.minHeight === minHeight ? before : { ready: true, minHeight });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    if (previous) observer.observe(previous);
    return () => observer.disconnect();
  }, [gridCard]);

  useEffect(() => {
    if (preview || !configured || (gridCard && !cardLayout.ready)) return;
    const element = ad.current;
    if (!element) return;
    let visible = !lazy || typeof IntersectionObserver === "undefined";
    function requestAd() {
      if (gridCard && element && cardSlot.current) {
        // Fixed available height, not an auto-sized creative that can grow the row.
        element.style.height = `${cardSlot.current.clientHeight}px`;
      }
      if (!element || !visible || requested.current || element.getBoundingClientRect().width <= 0) return;
      if (gridCard && element.getBoundingClientRect().height <= 0) return;
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
    if (gridCard && cardSlot.current) observer.observe(cardSlot.current);
    // Start fetching before scrolling reaches the placement, leaving time
    // for Google's response and creative rendering without requesting the whole page.
    const intersection = lazy && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        requestAd();
      }, { rootMargin: "1200px 0px" })
      : null;
    intersection?.observe(element);
    return () => {
      observer.disconnect();
      intersection?.disconnect();
    };
  }, [configured, lazy, preview, slot, gridCard, cardLayout.ready]);

  if (!preview && !configured) return null;

  return (
    <aside ref={cardBox} style={gridCard ? { minHeight: cardLayout.minHeight } : undefined} aria-label={m.label} data-article-ad={zodiac ? "zodiac-card" : homeCard ? `${variant}-card` : feed ? "feed-banner" : map ? "map-banner" : gallery ? "gallery-card" : card ? "guide-card" : "after-first-paragraph"} className={feed
      ? "not-prose w-full min-w-0 py-2"
      : map
      ? "not-prose w-full min-w-0"
      : gallery
      ? "not-prose flex aspect-[2/3] w-full min-w-0 flex-col self-start rounded-[1.15rem] bg-[var(--dd-surface-soft)] p-3 ring-1 ring-[var(--dd-border)] sm:rounded-[1.35rem] sm:p-5"
      : gridCard ? `not-prose relative w-full min-w-0 self-stretch rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] ${styles.gridCard}${homeCard ? ` ${styles.homeCard}` : ""}${zodiac ? ` ${styles.zodiacCard}` : ""}`
      : "not-prose my-6 w-full min-w-0"}>
      <div className={gridCard ? `${styles.gridCardContent}${compactCard ? ` ${styles.compactContent}` : ""}` : "contents"}>
      <p className={compactCard ? styles.compactLabel : "mb-2 text-center text-[10px] font-normal uppercase leading-4 tracking-widest text-[var(--dd-subtle)]"}>{m.label}</p>
      <div ref={cardSlot} className={gridCard ? "min-h-0 flex-1" : "contents"}>
      {preview ? (
        <div className={`flex w-full items-center justify-center rounded-xl border border-dashed border-[var(--dd-border-strong)] bg-[var(--dd-surface-soft)] px-4 text-center text-sm text-[var(--dd-muted)] ${feed ? styles.feedAd : map ? styles.mapAd : gridCard ? "h-full" : card ? "min-h-[100px] flex-1" : "min-h-[100px] sm:min-h-[90px]"}`}>
          {m.preview}
        </div>
      ) : (
        <ins ref={ad} className={`adsbygoogle${gallery ? " min-h-0 flex-1" : feed ? ` ${styles.feedAd}` : map ? ` ${styles.mapAd}` : ""}`} style={{ display: "block", width: "100%", height: gridCard ? "100%" : undefined, minHeight: gallery || map || feed || gridCard ? undefined : 90 }}
          data-ad-client={AD_CLIENT} data-ad-slot={slot} data-ad-format={map || feed || gridCard ? undefined : gallery ? "vertical" : "horizontal"} data-full-width-responsive="false" />
      )}
      </div>
      </div>
    </aside>
  );
}
