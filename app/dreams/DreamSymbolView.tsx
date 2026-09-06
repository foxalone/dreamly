import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Brain,
  CircleHelp,
  Compass,
  LibraryBig,
  Link2,
  MoonStar,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import SectionJumpNav from "./SectionJumpNav";
import { DreamPageImageFrame, DreamPageImagePickerButton, DreamPageImageProvider } from "./DreamPageImage";
import GuideLinkCards from "./GuideLinkCards";
import {
  getCategorySiblings,
  getCombosForSymbol,
  getDreamEntry,
  getDreamVariations,
  getParentEntry,
  getRelatedDreams,
  getRingLinks,
  type DreamEntry,
} from "@/lib/dream-dictionary";
import { DREAM_PAGE_IMAGE_HEIGHT, DREAM_PAGE_IMAGE_WIDTH, dreamPageImageAlt } from "@/lib/dreamPageImage";
import { getDreamPageImage } from "@/lib/getDreamPageImage";
import type { Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/i18n/config";
import { getCategoryCopy } from "@/lib/i18n/categories";
import { getLocalizedEntry, localizeEntryList } from "@/lib/i18n/localize-dictionary";
import { getLocalizedGuidesForSymbol } from "@/lib/i18n/localize-guides";
import { formatMessage, getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { absoluteLocaleUrl } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";

function InterpretationSection({
  id,
  eyebrow,
  title,
  icon: Icon,
  accent,
  paragraphs,
}: {
  id: string;
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  accent: string;
  paragraphs: string[];
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
      <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
        <div>
          <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{eyebrow}</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--dd-text)]">{title}</h2>
        </div>
        <div className="space-y-5 text-[15px] leading-7 text-[var(--dd-text-soft)] sm:text-base sm:leading-8">
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </div>
    </section>
  );
}

function EntryCard({ entry, label }: { entry: DreamEntry; label?: string }) {
  return (
    <LocaleLink
      href={`/dreams/${entry.slug}`}
      className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)] hover:bg-[var(--dd-surface-hover)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-3xl" aria-hidden="true">{entry.icon}</span>
        <ArrowRight size={16} className="text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
      </div>
      {label ? <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--dd-subtle)]">{label}</p> : null}
      <h3 className={label ? "mt-1 font-semibold text-[var(--dd-text)]" : "mt-4 font-semibold text-[var(--dd-text)]"}>{entry.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--dd-muted)]">{entry.shortMeaning}</p>
    </LocaleLink>
  );
}

export async function dreamSymbolMetadata(symbol: string, locale: Locale): Promise<Metadata> {
  const entry = getLocalizedEntry(symbol, locale);
  if (!entry) return {};
  const url = `/dreams/${entry.canonicalSlug}`;
  const pageImage = await getDreamPageImage(entry.slug);
  const assignedImage = pageImage?.imageUrl
    ? {
        url: pageImage.imageUrl,
        width: DREAM_PAGE_IMAGE_WIDTH,
        height: DREAM_PAGE_IMAGE_HEIGHT,
        alt: pageImage.alt || dreamPageImageAlt(entry.name),
      }
    : null;

  return {
    title: entry.seoTitle,
    description: entry.seoDescription,
    ...localeMetadata(url, locale),
    openGraph: {
      ...localeOpenGraph(url, locale, entry.seoTitle, entry.seoDescription, "article"),
      ...(assignedImage ? { images: [assignedImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: entry.seoTitle,
      description: entry.seoDescription,
      ...(assignedImage ? { images: [assignedImage] } : {}),
    },
  };
}

export default async function DreamSymbolView({ symbol, locale }: { symbol: string; locale: Locale }) {
  const english = getDreamEntry(symbol);
  const entry = getLocalizedEntry(symbol, locale);
  if (!english || !entry) notFound();

  const t = getMessages(locale);
  const category = getCategoryCopy(locale, entry.category);
  const parentEnglish = getParentEntry(english);
  const parent = getLocalizedEntry(parentEnglish.slug, locale) ?? parentEnglish;
  const variations = localizeEntryList(getDreamVariations(english), locale);
  const relatedVariations = entry.parentSlug
    ? variations.filter((variation) => variation.slug !== entry.slug)
    : variations;
  const relatedSymbols = localizeEntryList(getRelatedDreams(english), locale);
  const categorySiblings = localizeEntryList(getCategorySiblings(english), locale);
  const ringLinks = localizeEntryList(getRingLinks(english), locale);
  const combos = localizeEntryList(
    getCombosForSymbol(english.parentSlug ?? english.slug).filter((combo) => combo.slug !== english.slug),
    locale,
  );
  const relatedGuides = getLocalizedGuidesForSymbol(english.parentSlug ?? english.slug, locale);
  const pageImage = await getDreamPageImage(entry.slug);
  const pageUrl = absoluteLocaleUrl(`/dreams/${entry.canonicalSlug}`, locale);
  const articleImage = pageImage?.imageUrl
    ? {
        "@type": "ImageObject",
        url: pageImage.imageUrl,
        width: DREAM_PAGE_IMAGE_WIDTH,
        height: DREAM_PAGE_IMAGE_HEIGHT,
        caption: pageImage.alt || dreamPageImageAlt(entry.name),
      }
    : {
        "@type": "ImageObject",
        url: `${SITE_URL}/dreams/${entry.canonicalSlug}/opengraph-image`,
        width: 1200,
        height: 630,
        caption: entry.title,
      };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    description: entry.seoDescription,
    dateModified: entry.updatedAt,
    mainEntityOfPage: pageUrl,
    image: articleImage,
    articleSection: category.label,
    keywords: entry.aliases.join(", "),
    inLanguage: locale,
    isPartOf: entry.parentSlug
      ? { "@type": "CreativeWorkSeries", name: parent.title, url: absoluteLocaleUrl(`/dreams/${parent.slug}`, locale) }
      : { "@type": "CollectionPage", name: t.dictionary.h1, url: absoluteLocaleUrl("/dreams", locale) },
    author: { "@type": "Organization", name: "Dreamly" },
    publisher: { "@type": "Organization", name: "Dreamly", url: SITE_URL },
  };

  const faqJsonLd = entry.sections.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: entry.sections.faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }
    : null;

  const breadcrumbItems = [
    { name: t.chrome.home, url: absoluteLocaleUrl("/", locale) },
    { name: t.dictionary.h1, url: absoluteLocaleUrl("/dreams", locale) },
    { name: category.label, url: absoluteLocaleUrl(`/dreams/categories/${entry.category}`, locale) },
    ...(entry.parentSlug ? [{ name: parent.title, url: absoluteLocaleUrl(`/dreams/${parent.slug}`, locale) }] : []),
    { name: entry.title, url: pageUrl },
  ];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--dd-subtle)] sm:text-sm">
          <LocaleLink href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
            <ArrowLeft size={14} aria-hidden="true" /> {t.symbol.dictionary}
          </LocaleLink>
          {entry.parentSlug ? (
            <>
              <span aria-hidden="true">/</span>
              <LocaleLink href={`/dreams/${parent.slug}`} className="transition hover:text-[var(--dd-text)]">{parent.name}</LocaleLink>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-[var(--dd-muted)]">{entry.name}</span>
        </nav>

        <header className="relative mt-8 overflow-hidden rounded-[2rem] border border-[var(--dd-border)] bg-[var(--dd-surface)] px-6 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full blur-[85px]" style={{ backgroundColor: `${entry.accent}28` }} />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_190px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: entry.accent }}>
                  {entry.parentSlug ? t.chrome.dreamVariation : t.chrome.parentDream}
                </p>
                <LocaleLink
                  href={`/dreams/categories/${entry.category}`}
                  className="rounded-full bg-[var(--dd-surface-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dd-subtle)] transition hover:text-[var(--dd-text)]"
                >
                  {category.label}
                </LocaleLink>
              </div>
              <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{entry.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">{entry.shortMeaning}</p>
            </div>
            <div className="hidden justify-center md:flex">
              <span className="text-8xl drop-shadow-2xl" aria-hidden="true">{entry.icon}</span>
            </div>
          </div>
        </header>

        <SectionJumpNav accent={entry.accent} />

        {entry.parentSlug ? (
          <aside className="mt-8 flex flex-col gap-4 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl text-2xl" style={{ backgroundColor: `${entry.accent}18` }} aria-hidden="true">{parent.icon}</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.mainSymbol}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--dd-text)]">{parent.title}</p>
              </div>
            </div>
            <LocaleLink href={`/dreams/${parent.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: entry.accent }}>
              {t.chrome.viewParent} <ArrowRight size={15} aria-hidden="true" />
            </LocaleLink>
          </aside>
        ) : null}

        <section id="meaning" className="scroll-mt-24 py-12 sm:py-16">
          <DreamPageImageProvider slug={entry.slug} accent={entry.accent} initialImage={pageImage}>
            <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
              <div>
                <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                  <BookOpenText size={21} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.coreSymbol}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">{t.chrome.generalMeaning}</h2>
                  <DreamPageImagePickerButton />
                </div>
              </div>
              <div>
                <DreamPageImageFrame />
                <div className="space-y-5 text-[15px] leading-7 text-[var(--dd-text-soft)] sm:text-base sm:leading-8">
                  {[...entry.sections.introduction, ...entry.sections.general].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
                <h3 className="mt-9 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--dd-subtle)]">{t.chrome.commonScenarios}</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {entry.sections.commonScenarios.map((scenario) => (
                    <div key={scenario.title} className="rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-4">
                      <h4 className="text-sm font-semibold text-[var(--dd-text)]">{scenario.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-[var(--dd-subtle)]">{scenario.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DreamPageImageProvider>
        </section>

        <section className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="variations-title">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
              <Link2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">
                {entry.parentSlug ? t.chrome.siblingPages : t.chrome.longTail}
              </p>
              <h2 id="variations-title" className="mt-1.5 text-2xl font-semibold tracking-tight">
                {entry.parentSlug
                  ? formatMessage(t.chrome.relatedVariations, { name: parent.name })
                  : t.chrome.commonVariations}
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedVariations.map((variation) => <EntryCard key={variation.slug} entry={variation} />)}
          </div>
        </section>

        <InterpretationSection id="psychology" eyebrow={t.symbol.psychologicalEyebrow} title={t.symbol.psychologicalTitle} icon={Brain} accent={entry.accent} paragraphs={entry.sections.psychological} />
        <InterpretationSection id="spiritual" eyebrow={t.symbol.spiritualEyebrow} title={t.symbol.spiritualTitle} icon={Sparkles} accent={entry.accent} paragraphs={entry.sections.spiritual} />
        <InterpretationSection id="islamic" eyebrow={t.symbol.islamicEyebrow} title={t.symbol.islamicTitle} icon={MoonStar} accent={entry.accent} paragraphs={entry.sections.islamic} />
        <InterpretationSection id="biblical" eyebrow={t.symbol.biblicalEyebrow} title={t.symbol.biblicalTitle} icon={LibraryBig} accent={entry.accent} paragraphs={entry.sections.biblical} />

        <section id="questions" className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
          <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
            <div>
              <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                <CircleHelp size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.popularQuestions}</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{t.chrome.peopleAlsoAsk}</h2>
            </div>
            <div className="space-y-3">
              {entry.sections.faq.map(({ question, answer }) => (
                <details key={question} className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-5 open:bg-[var(--dd-surface-hover)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--dd-text)] sm:text-base">
                    {question}
                    <span className="text-xl font-light text-[var(--dd-subtle)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 pr-6 text-sm leading-7 text-[var(--dd-muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {relatedGuides.length > 0 ? (
          <aside className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="symbol-guides-title">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.dictionary.learnTitle}</p>
            <h2 id="symbol-guides-title" className="mt-1.5 text-2xl font-semibold tracking-tight">{t.chrome.howConnects}</h2>
            <div className="mt-6">
              <GuideLinkCards guides={relatedGuides} />
            </div>
          </aside>
        ) : null}

        <section id="related" className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
          <div>
            <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
              <Compass size={21} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.crossCluster}</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">{t.chrome.relatedSymbols}</h2>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedSymbols.map((related) => (
              <EntryCard
                key={related.slug}
                entry={related}
                label={related.parentSlug ? t.chrome.relatedVariation : t.chrome.relatedParent}
              />
            ))}
          </div>
        </section>

        {combos.length > 0 ? (
          <section className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="combos-title">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.combinedSymbols}</p>
            <h2 id="combos-title" className="mt-1.5 text-2xl font-semibold tracking-tight">
              {formatMessage(t.chrome.combinationDreams, { name: parent.name })}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {combos.map((combo) => <EntryCard key={combo.slug} entry={combo} label={t.chrome.combination} />)}
            </div>
          </section>
        ) : null}

        {categorySiblings.length > 0 ? (
          <section className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="category-siblings-title">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.sameTheme}</p>
                <h2 id="category-siblings-title" className="mt-1.5 text-2xl font-semibold tracking-tight">
                  {formatMessage(t.chrome.moreCategory, { category: category.label })}
                </h2>
              </div>
              <LocaleLink href={`/dreams/categories/${entry.category}`} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: entry.accent }}>
                {formatMessage(t.chrome.viewAll, { category: category.label })} <ArrowRight size={15} aria-hidden="true" />
              </LocaleLink>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categorySiblings.map((sibling) => <EntryCard key={sibling.slug} entry={sibling} />)}
            </div>
          </section>
        ) : null}

        <nav className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="continue-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.chrome.keepReading}</p>
          <h2 id="continue-title" className="mt-1.5 text-2xl font-semibold tracking-tight">{t.chrome.continueExploring}</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {ringLinks.map((link) => (
              <LocaleLink
                key={link.slug}
                href={`/dreams/${link.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3.5 py-2 text-sm text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.title}
              </LocaleLink>
            ))}
            <LocaleLink
              href="/dreams/a-z"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--dd-border)] px-3.5 py-2 text-sm font-semibold text-[var(--dd-text-soft)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
            >
              {t.chrome.browseAz} <ArrowRight size={14} aria-hidden="true" />
            </LocaleLink>
          </div>
        </nav>

        <aside className="rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          {t.symbol.disclaimer}
        </aside>
      </article>
    </main>
  );
}
