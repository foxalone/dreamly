"use client";

import { useLayoutEffect, useRef, useState } from "react";

import LocaleLink from "@/lib/i18n/LocaleLink";

/**
 * Two lines of a reading. The analysis tag shares the first line, and "more"
 * sits immediately after the last visible word — not at the far edge.
 * The feed links to the dream; the dream page uses the button to open the rest.
 */
export default function AnalysisExcerpt({
  text,
  label,
  more,
  moreTitle,
  href,
  onMore,
  busy,
  className,
}: {
  text: string;
  label: string;
  more?: string;
  moreTitle?: string;
  href?: string;
  onMore?: () => void;
  busy?: boolean;
  className?: string;
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
  }, [flat, showMore, more, label]);

  const moreClass = "inline font-semibold text-purple-500 hover:text-purple-400 disabled:opacity-60";
  return (
    <p
      ref={boxRef}
      dir={dir}
      className={[
        "max-h-12 overflow-hidden break-words text-sm leading-6 text-[var(--muted)]",
        className ?? "mt-3",
      ].join(" ")}
    >
      <span className="me-1.5 inline-flex items-center align-middle rounded-full border border-purple-400/50 bg-purple-500/15 px-2 py-0 text-xs font-semibold leading-5 text-purple-500">
        {label}
      </span>
      <span data-excerpt>{shown}</span>
      {showMore ? " " : null}
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
