"use client";

import LocaleLink from "@/lib/i18n/LocaleLink";

/**
 * Two lines of a reading: the analysis tag on the first line, and "more"
 * at the end of the second. The feed links to the dream; the dream page
 * uses the button to open the rest.
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
  const showMore = Boolean(more && (href || onMore));
  const dir = /[\u0590-\u08FF]/.test(text) ? "rtl" : "ltr";
  const moreClass = "float-end clear-end ms-1 font-semibold text-purple-500 hover:text-purple-400 disabled:opacity-60";
  return (
    <p
      dir={dir}
      className={[
        "max-h-12 overflow-hidden break-words text-sm leading-6 text-[var(--muted)]",
        showMore ? "before:float-end before:h-6 before:w-0 before:content-['']" : "",
        className ?? "mt-3",
      ].join(" ")}
    >
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
      <span className="me-1.5 inline-flex items-center align-middle rounded-full border border-purple-400/50 bg-purple-500/15 px-2 py-0 text-xs font-semibold leading-5 text-purple-500">
        {label}
      </span>
      {text.replace(/\s+/g, " ")}
    </p>
  );
}
