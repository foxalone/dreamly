"use client";

import { useLayoutEffect, useRef, useState } from "react";

import LocaleLink from "@/lib/i18n/LocaleLink";

/**
 * Two lines of a reading with "more" immediately after the last visible word.
 * Analysis can show a tag; the horoscope reuses the excerpt without one.
 */
export default function AnalysisExcerpt({
  text,
  label,
  more,
  moreTitle,
  morePrefix,
  href,
  onMore,
  busy,
  className,
  variant = "analysis",
}: {
  text: string;
  label?: string;
  more?: string;
  moreTitle?: string;
  morePrefix?: string;
  href?: string;
  onMore?: () => void;
  busy?: boolean;
  className?: string;
  variant?: "analysis" | "horoscope";
}) {
  const flat = text.replace(/\s+/g, " ").trim();
  const showMore = Boolean(more && (href || onMore));
  const dir = /[\u0590-\u08FF]/.test(flat) ? "rtl" : "ltr";
  const boxRef = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(flat);

  useLayoutEffect(() => {
    const el = boxRef.current;
    const node = el?.querySelector("[data-excerpt]");
    if (!el || !(node instanceof HTMLElement)) return;

    const fit = () => {
      if (!showMore) {
        node.textContent = flat;
        setShown((prev) => (prev === flat ? prev : flat));
        return;
      }
      const limit = twoLines(el);
      let lo = 0;
      let hi = flat.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        node.textContent = flat.slice(0, mid);
        if (el.scrollHeight <= limit) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      let cut = flat.slice(0, best).trimEnd();
      if (best < flat.length) {
        const space = cut.lastIndexOf(" ");
        if (space > 24) cut = cut.slice(0, space).trimEnd();
      }
      node.textContent = cut;
      while (cut && el.scrollHeight > limit) {
        const space = cut.lastIndexOf(" ");
        cut = (space > 0 ? cut.slice(0, space) : "").trimEnd();
        node.textContent = cut;
      }
      setShown((prev) => (prev === cut ? prev : cut));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [flat, showMore, more, label, morePrefix]);

  const moreClass = variant === "horoscope" ? "hc-forecast-more" : "inline font-semibold text-purple-500 hover:text-purple-400 disabled:opacity-60";
  return (
    <p
      ref={boxRef}
      dir={dir}
      className={[
        variant === "horoscope" ? "hc-forecast-excerpt" : "max-h-12 overflow-hidden break-words text-sm leading-6 text-[var(--muted)]",
        className ?? "mt-3",
      ].join(" ")}
    >
      {label ? <span className="me-1.5 inline-flex items-center align-middle rounded-full border border-purple-400/50 bg-purple-500/15 px-2 py-0 text-xs font-semibold leading-5 text-purple-500">{label}</span> : null}
      <span data-excerpt>{shown}</span>
      {showMore ? morePrefix ?? " " : null}
      {showMore && href ? (
        <LocaleLink href={href} title={moreTitle} className={moreClass}>
          {more}
        </LocaleLink>
      ) : null}
      {showMore && !href ? (
        <button type="button" onClick={onMore} disabled={busy} title={moreTitle} className={moreClass}>
          {more}
        </button>
      ) : null}
    </p>
  );
}

/** Visible height of two leading-6 lines, even when the paragraph is still shorter. */
function twoLines(el: HTMLElement): number {
  const line = parseFloat(getComputedStyle(el).lineHeight);
  return Number.isFinite(line) && line > 0 ? line * 2 + 1 : el.clientHeight + 1;
}
