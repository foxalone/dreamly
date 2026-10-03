"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";
import { SHARE_BADGES, nextShareBadge, shareBadgeFor, shareBadgeRange } from "@/lib/shareBadges";

/**
 * The whole creature ladder (lib/shareBadges.ts) as a timeline: levels already
 * reached in colour, the current one highlighted, the ones ahead greyed out.
 * `count` = shared, not deleted dreams; null while loading.
 */
export default function ShareBadgeTimeline({ count }: { count: number | null }) {
  const t = useMessages();
  const n = count ?? 0;
  const current = shareBadgeFor(n);
  const next = nextShareBadge(n);
  // progress inside the current level, towards the next one
  // On narrow screens the ladder scrolls sideways: keep the current step in view.
  const listRef = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !el || list.scrollWidth <= list.clientWidth) return;
    if (getComputedStyle(list).direction === "rtl") return; // scrollLeft is negative there; leave it at the start
    list.scrollLeft = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
  }, [current.id]);
  const pct = next ? Math.round(((n - current.min) / (next.badge.min - current.min)) * 100) : 100;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" aria-busy={count === null}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold text-[var(--text)]">{t.shareBadges.timelineTitle}</h2>
        <span className="text-sm font-semibold text-[var(--text)]">
          {formatMessage(t.shareBadges.yourLevel, { badge: shareBadgeLabel(t, current) })}
        </span>
      </div>

      <p className="mt-1 text-xs text-[var(--muted)]">
        {count === null
          ? "…"
          : next
            ? formatMessage(t.shareBadges.progress, { n, left: next.remaining, next: shareBadgeLabel(t, next.badge) })
            : formatMessage(t.shareBadges.maxLevel, { n })}
      </p>

      {next ? (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(127,127,127,0.18)]">
          <div className="h-full rounded-full bg-purple-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      <ol ref={listRef} className="relative mt-4 flex overflow-x-auto pt-2 pb-1 [scrollbar-width:thin]">
        {SHARE_BADGES.map((b, i) => {
          const reached = n >= b.min;
          const isCurrent = b.id === current.id;
          const name = t.shareBadges.names[b.id];
          return (
            <li
              key={b.id}
              className="relative flex min-w-[4.5rem] flex-1 flex-col items-center text-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              {i > 0 ? (
                // segment from the previous step to this one
                <span
                  aria-hidden
                  className={[
                    "absolute top-[22px] end-1/2 h-0.5 w-full",
                    reached ? "bg-purple-500" : "border-t-2 border-dashed border-[rgba(127,127,127,0.35)]",
                  ].join(" ")}
                />
              ) : null}
              <span
                className={[
                  "relative z-[1] flex size-11 items-center justify-center rounded-full text-2xl leading-none transition",
                  isCurrent
                    ? "bg-[color-mix(in_srgb,#a855f7_22%,var(--card))] ring-2 ring-purple-500 scale-110 shadow-[0_6px_20px_rgba(124,58,237,0.35)]"
                    : reached
                      ? "bg-[color-mix(in_srgb,#a855f7_14%,var(--card))] ring-1 ring-purple-400/60"
                      : "bg-[var(--card)] ring-1 ring-[rgba(127,127,127,0.3)]",
                ].join(" ")}
                title={`${name} · ${shareBadgeRange(b.id)}`}
              >
                <span className={reached ? "" : "grayscale opacity-35"}>{b.emoji}</span>
              </span>
              <span
                className={[
                  "mt-2 px-0.5 text-[11px] font-semibold leading-tight",
                  reached ? "text-[var(--text)]" : "text-[var(--muted)] opacity-60",
                ].join(" ")}
              >
                {name}
              </span>
              <span className={["text-[10px] tabular-nums text-[var(--muted)]", reached ? "" : "opacity-60"].join(" ")}>
                {shareBadgeRange(b.id)}
              </span>
              {isCurrent ? (
                <span className="mt-1 rounded-full bg-purple-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  {t.shareBadges.youAreHere}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {next ? <p className="mt-3 text-xs text-[var(--muted)]">{t.shareBadges.timelineHint}</p> : null}
    </section>
  );
}
