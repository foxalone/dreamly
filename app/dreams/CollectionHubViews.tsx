import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import {
  DREAM_CATEGORIES,
  MOST_COMMON_DREAM_SLUGS,
  getAllEntriesByCategory,
  getDreamsByCategory,
  type DreamCategory,
} from "@/lib/dream-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_META, SITE_URL } from "@/lib/i18n/config";
import { getAllCategoryCopy, getCategoryCopy } from "@/lib/i18n/categories";
import {
  getLocalizedDictionary,
  getLocalizedEntries,
  getLocalizedEntry,
} from "@/lib/i18n/localize-dictionary";
import { getLocalizedGuide } from "@/lib/i18n/localize-guides";
import { getMessages } from "@/lib/i18n/messages";
import { absoluteLocaleUrl } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";
import GuideLinkCards from "./GuideLinkCards";

const SCARY_SYMBOL_SLUGS = [
  "nightmare", "being-chased", "falling", "heights", "being-naked", "demon", "ghost",
  "snake-bite", "dog-bite", "shark-attack", "drowning", "being-killed", "car-accident",
  "plane-crash", "tsunami-coming", "tornado-coming", "haunted-house", "burning-house",
  "chased-by-monster", "spider-bite", "alligator-attack", "earthquake", "storm-at-sea", "fire",
] as const;

function Breadcrumb({ locale, current }: { locale: Locale; current: string }) {
  const t = getMessages(locale);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--dd-subtle)] sm:text-sm">
      <LocaleLink href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
        <ArrowLeft size={14} aria-hidden="true" /> {t.symbol.dictionary}
      </LocaleLink>
      <ChevronRight size={13} aria-hidden="true" />
      <span className="text-[var(--dd-muted)]">{current}</span>
    </nav>
  );
}

export function AzIndexView({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const collator = new Intl.Collator(LOCALE_META[locale].htmlLang);
  const sorted = [...getLocalizedEntries(locale)].sort((a, b) => collator.compare(a.title, b.title));
  const groups = new Map<string, typeof sorted>();
  for (const entry of sorted) {
    const letter = entry.title[0]?.toLocaleUpperCase(LOCALE_META[locale].htmlLang) || "#";
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(entry);
  }
  const letters = [...groups.keys()];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.chrome.aToZTitle,
    url: absoluteLocaleUrl("/dreams/a-z", locale),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sorted.length,
      itemListElement: sorted.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.title,
        url: absoluteLocaleUrl(`/dreams/${entry.canonicalSlug}`, locale),
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <Breadcrumb locale={locale} current={t.dictionary.aToZ} />
        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{t.chrome.aToZTitle}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--dd-muted)]">{t.chrome.aToZLead}</p>
        </header>
        <nav className="mt-8 flex flex-wrap gap-1.5" aria-label={t.dictionary.aToZ}>
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="grid size-9 place-items-center rounded-xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] text-sm font-semibold text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
            >
              {letter}
            </a>
          ))}
        </nav>
        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`} className="mt-10 scroll-mt-24">
            <h2 className="border-b border-[var(--dd-border)] pb-3 text-2xl font-semibold tracking-tight">{letter}</h2>
            <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.get(letter)!.map((entry) => (
                <li key={entry.slug}>
                  <LocaleLink
                    href={`/dreams/${entry.slug}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--dd-muted)] transition hover:bg-[var(--dd-surface-soft)] hover:text-[var(--dd-text)]"
                  >
                    <span aria-hidden="true">{entry.icon}</span>
                    <span className="truncate">{entry.title}</span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

export function MostCommonView({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const entries = MOST_COMMON_DREAM_SLUGS.map((slug) => getLocalizedEntry(slug, locale)).filter(Boolean);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.chrome.mostCommonTitle,
    url: absoluteLocaleUrl("/dreams/most-common", locale),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry!.title,
        url: absoluteLocaleUrl(`/dreams/${entry!.canonicalSlug}`, locale),
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <Breadcrumb locale={locale} current={t.dictionary.mostCommon} />
        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{t.chrome.mostCommonTitle}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">{t.chrome.mostCommonLead}</p>
        </header>
        <ol className="mt-10 space-y-4">
          {entries.map((entry, index) => (
            <li key={entry!.slug}>
              <LocaleLink
                href={`/dreams/${entry!.slug}`}
                className="group flex items-start gap-5 rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
              >
                <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--dd-surface-soft)] text-sm font-bold text-[var(--dd-subtle)]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{entry!.icon}</span>
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--dd-text)]">{entry!.title}</h2>
                    <span className="rounded-full bg-[var(--dd-surface-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dd-subtle)]">
                      {getCategoryCopy(locale, entry!.category).label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--dd-muted)]">{entry!.shortMeaning}</p>
                </div>
                <ArrowRight size={16} className="mt-2 shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
              </LocaleLink>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

export function NightmaresView({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const dict = getLocalizedDictionary(locale);
  const fearEntries = getAllEntriesByCategory("fear-nightmares").map((entry) => dict[entry.slug]).filter(Boolean);
  const scaryEntries = SCARY_SYMBOL_SLUGS.map((slug) => dict[slug]).filter(Boolean);
  const guides = [
    "how-to-stop-nightmares",
    "night-terrors",
    "anxiety-dreams",
    "hypnagogic-hallucinations",
    "recurring-dreams",
    "sleep-paralysis",
    "false-awakening",
    "healing-dreams",
    "types-of-dreams",
  ]
    .map((slug) => getLocalizedGuide(slug, locale))
    .filter(Boolean);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.chrome.nightmaresTitle,
    url: absoluteLocaleUrl("/dreams/nightmares", locale),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: SITE_URL },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <Breadcrumb locale={locale} current={t.dictionary.nightmares} />
        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{t.chrome.nightmaresTitle}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">{t.chrome.nightmaresLead}</p>
        </header>
        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.dictionary.learnTitle}</p>
          <div className="mt-6">
            <GuideLinkCards guides={guides as NonNullable<(typeof guides)[number]>[]} />
          </div>
        </section>
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">{t.chrome.nightmaresTitle}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {scaryEntries.map((entry) => (
              <LocaleLink
                key={entry.slug}
                href={`/dreams/${entry.slug}`}
                className="group flex items-start gap-4 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
              >
                <span className="text-3xl" aria-hidden="true">{entry.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[var(--dd-text)]">{entry.title}</span>
                    <ArrowRight size={15} className="shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-[var(--dd-muted)]">{entry.shortMeaning}</span>
                </span>
              </LocaleLink>
            ))}
          </div>
        </section>
        <section className="mt-12 border-t border-[var(--dd-border)] pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">{getCategoryCopy(locale, "fear-nightmares").label}</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {fearEntries.map((entry) => (
              <LocaleLink
                key={entry.slug}
                href={`/dreams/${entry.slug}`}
                className="rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3.5 py-2 text-sm text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
              >
                {entry.title}
              </LocaleLink>
            ))}
          </div>
        </section>
        <aside className="mt-12 rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          {t.guide.medicalNote}
        </aside>
      </div>
    </main>
  );
}

export function CategoryHubView({ locale, category }: { locale: Locale; category: DreamCategory }) {
  const t = getMessages(locale);
  const info = getCategoryCopy(locale, category);
  const icon = DREAM_CATEGORIES[category].icon;
  const dict = getLocalizedDictionary(locale);
  const parents = getDreamsByCategory(category).map((entry) => dict[entry.slug]).filter(Boolean);
  const allEntries = getAllEntriesByCategory(category).map((entry) => dict[entry.slug]).filter(Boolean);
  const otherCategories = (Object.keys(DREAM_CATEGORIES) as DreamCategory[]).filter((c) => c !== category);
  const categories = getAllCategoryCopy(locale);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: info.label,
    description: info.description,
    url: absoluteLocaleUrl(`/dreams/categories/${category}`, locale),
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: allEntries.length,
      itemListElement: allEntries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.title,
        url: absoluteLocaleUrl(`/dreams/${entry.canonicalSlug}`, locale),
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <Breadcrumb locale={locale} current={info.label} />
        <header className="mt-8 rounded-[2rem] border border-[var(--dd-border)] bg-[var(--dd-surface)] px-6 py-10 sm:px-10 sm:py-14">
          <span className="text-5xl" aria-hidden="true">{icon}</span>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{info.label}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">{info.description}</p>
          <p className="mt-3 text-sm text-[var(--dd-subtle)]">
            {parents.length} · {allEntries.length} {t.dictionary.featuredMeanings}
          </p>
        </header>
        <section className="mt-10 space-y-10">
          {parents.map((parent) => (
            <article key={parent.slug} className="rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl" aria-hidden="true">{parent.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      <LocaleLink href={`/dreams/${parent.slug}`} className="transition hover:text-[var(--dd-accent-text)]">{parent.title}</LocaleLink>
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--dd-muted)]">{parent.shortMeaning}</p>
                  </div>
                </div>
                <LocaleLink href={`/dreams/${parent.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: parent.accent }}>
                  {t.dictionary.explore} <ArrowRight size={15} aria-hidden="true" />
                </LocaleLink>
              </div>
              {parent.variationSlugs.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {parent.variationSlugs.map((slug) => {
                    const variation = dict[slug];
                    if (!variation) return null;
                    return (
                      <LocaleLink
                        key={slug}
                        href={`/dreams/${slug}`}
                        className="rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3 py-1.5 text-xs text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
                      >
                        {variation.name}
                      </LocaleLink>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </section>
        <nav className="mt-14 border-t border-[var(--dd-border)] pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">{t.chrome.dreamCategories}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {otherCategories.map((slug) => {
              const other = categories[slug];
              const count = getLocalizedEntries(locale).filter((entry) => entry.category === slug).length;
              return (
                <LocaleLink
                  key={slug}
                  href={`/dreams/categories/${slug}`}
                  className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
                >
                  <span className="text-2xl" aria-hidden="true">{DREAM_CATEGORIES[slug].icon}</span>
                  <p className="mt-2 text-sm font-semibold text-[var(--dd-text)]">{other.label}</p>
                  <p className="mt-1 text-xs text-[var(--dd-subtle)]">{count} {t.chrome.pages}</p>
                </LocaleLink>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
