"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_META } from "./config";
import { switchLocalePath } from "./path";
import { useLocale, useMessages } from "./LocaleProvider";
import { SegmentedPill, segmentedThumbClass } from "@/app/components/SegmentedPill";

export default function LanguageSwitcher({
  compact = false,
  segmented = false,
}: {
  compact?: boolean;
  segmented?: boolean;
}) {
  const locale = useLocale();
  const t = useMessages();
  const pathname = usePathname() || "/";

  if (segmented) {
    return (
      <SegmentedPill ariaLabel={t.nav.language}>
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <a
              key={code}
              href={switchLocalePath(pathname, code)}
              hrefLang={LOCALE_META[code].htmlLang}
              lang={LOCALE_META[code].htmlLang}
              role="radio"
              aria-checked={active}
              aria-current={active ? "page" : undefined}
              title={LOCALE_META[code].nativeLabel}
              className={segmentedThumbClass(active)}
            >
              {code.toUpperCase()}
            </a>
          );
        })}
      </SegmentedPill>
    );
  }

  return (
    <nav aria-label={t.nav.language} className="flex flex-wrap items-center gap-1">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <a
            key={code}
            href={switchLocalePath(pathname, code)}
            hrefLang={LOCALE_META[code].htmlLang}
            lang={LOCALE_META[code].htmlLang}
            className={
              active
                ? "rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                : "rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
            }
            aria-current={active ? "page" : undefined}
          >
            {compact ? code.toUpperCase() : LOCALE_META[code].nativeLabel}
          </a>
        );
      })}
    </nav>
  );
}
