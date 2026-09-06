"use client";

import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_META } from "./config";
import { switchLocalePath } from "./path";
import { useLocale } from "./LocaleProvider";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname() || "/";

  return (
    <nav aria-label={LOCALE_META[locale].nativeLabel} className="flex flex-wrap items-center gap-1">
      {LOCALES.map((code) => {
        const active = code === locale;
        const href = switchLocalePath(pathname, code);
        return (
          <a
            key={code}
            href={href}
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
