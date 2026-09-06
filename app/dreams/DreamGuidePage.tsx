import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { DreamGuide } from "@/lib/dream-guides";
import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE, SITE_URL } from "@/lib/i18n/config";
import { getLocalizedEntry } from "@/lib/i18n/localize-dictionary";
import { getLocalizedSiblingGuides } from "@/lib/i18n/localize-guides";
import { getMessages } from "@/lib/i18n/messages";
import { absoluteLocaleUrl } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";
import GuideLinkCards from "./GuideLinkCards";

export default function DreamGuidePage({
  guide,
  locale = DEFAULT_LOCALE,
}: {
  guide: DreamGuide;
  locale?: Locale;
}) {
  const t = getMessages(locale);
  const relatedSymbols = guide.relatedSymbolSlugs
    .map((slug) => getLocalizedEntry(slug, locale))
    .filter(Boolean);
  const siblings = getLocalizedSiblingGuides(guide.slug, locale);
  const pageUrl = absoluteLocaleUrl(`/dreams/${guide.slug}`, locale);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seoDescription,
    dateModified: guide.updatedAt,
    mainEntityOfPage: pageUrl,
    inLanguage: locale,
    author: { "@type": "Organization", name: "Dreamly" },
    publisher: { "@type": "Organization", name: "Dreamly", url: SITE_URL },
    isPartOf: { "@type": "CollectionPage", name: t.dictionary.h1, url: absoluteLocaleUrl("/dreams", locale) },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.chrome.home, item: absoluteLocaleUrl("/", locale) },
      { "@type": "ListItem", position: 2, name: t.dictionary.h1, item: absoluteLocaleUrl("/dreams", locale) },
      { "@type": "ListItem", position: 3, name: guide.title, item: pageUrl },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--dd-subtle)] sm:text-sm">
          <LocaleLink href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
            <ArrowLeft size={14} aria-hidden="true" /> {t.guide.dictionary}
          </LocaleLink>
          <ChevronRight size={13} aria-hidden="true" />
          <LocaleLink href="/dreams#how-dreaming-works" className="transition hover:text-[var(--dd-text)]">
            {t.guide.howDreamingWorks}
          </LocaleLink>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="text-[var(--dd-muted)]">{guide.name}</span>
        </nav>

        <header className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: guide.accent }}>
            {t.guide.learn}
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{guide.title}</h1>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">
            {guide.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </header>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-12 border-t border-[var(--dd-border)] pt-10">
            <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
            <div className="mt-5 max-w-3xl space-y-4 text-[15px] leading-7 text-[var(--dd-text-soft)] sm:text-base sm:leading-8">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-12 border-t border-[var(--dd-border)] pt-10" aria-labelledby="guide-questions-title">
          <h2 id="guide-questions-title" className="text-2xl font-semibold tracking-tight">{t.chrome.peopleAlsoAsk}</h2>
          <div className="mt-6 space-y-3">
            {guide.faqs.map(({ question, answer }) => (
              <details
                key={question}
                className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-5 open:bg-[var(--dd-surface-hover)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--dd-text)] sm:text-base">
                  {question}
                  <span className="text-xl font-light text-[var(--dd-subtle)] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 pr-6 text-sm leading-7 text-[var(--dd-muted)]">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {relatedSymbols.length > 0 ? (
          <section className="mt-12 border-t border-[var(--dd-border)] pt-10" aria-labelledby="guide-symbols-title">
            <h2 id="guide-symbols-title" className="text-2xl font-semibold tracking-tight">{t.chrome.relatedSymbols}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {relatedSymbols.map((entry) => (
                <LocaleLink
                  key={entry!.slug}
                  href={`/dreams/${entry!.slug}`}
                  className="group flex items-start gap-4 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
                >
                  <span className="text-3xl" aria-hidden="true">{entry!.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-[var(--dd-text)]">{entry!.title}</span>
                      <ArrowRight size={15} className="shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-[var(--dd-muted)]">{entry!.shortMeaning}</span>
                  </span>
                </LocaleLink>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12 border-t border-[var(--dd-border)] pt-10" aria-labelledby="other-guides-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.guide.howDreamingWorks}</p>
          <h2 id="other-guides-title" className="mt-1.5 text-2xl font-semibold tracking-tight">{t.guide.moreAbout}</h2>
          <div className="mt-6">
            <GuideLinkCards guides={siblings} />
          </div>
        </section>

        <aside className="mt-12 rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          {t.guide.medicalNote}
        </aside>
      </article>
    </main>
  );
}
