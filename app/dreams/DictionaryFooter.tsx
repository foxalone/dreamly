"use client";

import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { getAllCategoryCopy } from "@/lib/i18n/categories";
import type { DreamCategory } from "@/lib/dream-categories";
import { DREAM_CATEGORIES } from "@/lib/dream-categories";

export default function DictionaryFooter() {
  const locale = useLocale();
  const t = useMessages();
  const categories = getAllCategoryCopy(locale);

  const hubs: { href: string; label: string }[] = [
    { href: "/dreams", label: t.dictionary.h1 },
    { href: "/gallery", label: t.gallery.h1 },
    { href: "/dreams/a-z", label: t.dictionary.aToZ },
    { href: "/dreams/most-common", label: t.dictionary.mostCommon },
    { href: "/dreams/nightmares", label: t.dictionary.nightmares },
    { href: "/dreams/why-we-dream", label: t.guide.learn },
    { href: "/dreams/types-of-dreams", label: t.dictionary.howDreamingWorks },
    { href: "/dreams/biblical", label: t.dictionary.biblical },
    { href: "/dreams/islamic", label: t.dictionary.islamic },
    { href: "/dreams/spiritual", label: t.dictionary.spiritual },
  ];

  return (
    <footer className="border-t border-[var(--dd-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:grid-cols-2 sm:px-8 sm:py-12 lg:grid-cols-[1.3fr_1.3fr_0.8fr] lg:gap-12">
        <nav aria-label={t.dictionary.explore}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.dictionary.explore}</p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 min-[380px]:grid-cols-2">
            {hubs.map((link) => (
              <li key={link.href}>
                <LocaleLink href={link.href} className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                  {link.label}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.dictionary.categories}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.dictionary.categories}</p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 min-[380px]:grid-cols-2">
            {(Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => (
              <li key={category}>
                <LocaleLink href={`/dreams/categories/${category}`} className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                  {categories[category].label}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t.dictionary.legal} className="sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.dictionary.legal}</p>
          <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 lg:flex-col">
            <li>
              <LocaleLink href="/privacy" className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                {t.legal.privacy}
              </LocaleLink>
            </li>
            <li>
              <LocaleLink href="/terms" className="text-sm text-[var(--dd-muted)] transition hover:text-[var(--dd-text)]">
                {t.legal.terms}
              </LocaleLink>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
