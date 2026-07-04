import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Brain,
  ChevronRight,
  CircleHelp,
  Compass,
  LibraryBig,
  Link2,
  MoonStar,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import SectionJumpNav from "../SectionJumpNav";
import {
  DREAM_CATEGORIES,
  DREAM_SLUGS,
  getCategorySiblings,
  getCombosForSymbol,
  getDreamEntry,
  getDreamVariations,
  getParentEntry,
  getRelatedDreams,
  getRingLinks,
  type DreamEntry,
} from "@/lib/dream-dictionary";

type PageProps = { params: Promise<{ symbol: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return DREAM_SLUGS.map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const entry = getDreamEntry(symbol);
  if (!entry) return {};

  const url = `/dreams/${entry.canonicalSlug}`;
  return {
    title: entry.seoTitle,
    description: entry.seoDescription,
    alternates: { canonical: url },
    openGraph: {
      title: entry.seoTitle,
      description: entry.seoDescription,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: entry.seoTitle,
      description: entry.seoDescription,
    },
  };
}

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
    <Link
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
    </Link>
  );
}

export default async function DreamSymbolPage({ params }: PageProps) {
  const { symbol } = await params;
  const entry = getDreamEntry(symbol);
  if (!entry) notFound();

  const parent = getParentEntry(entry);
  const variations = getDreamVariations(entry);
  const relatedVariations = entry.parentSlug
    ? variations.filter((variation) => variation.slug !== entry.slug).slice(0, 6)
    : variations;
  const relatedSymbols = getRelatedDreams(entry);
  const category = DREAM_CATEGORIES[entry.category];
  const categorySiblings = getCategorySiblings(entry);
  const ringLinks = getRingLinks(entry);
  const combos = getCombosForSymbol(entry.parentSlug ?? entry.slug).filter((combo) => combo.slug !== entry.slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.title,
    description: entry.seoDescription,
    mainEntityOfPage: `https://dreamly.art/dreams/${entry.canonicalSlug}`,
    image: {
      "@type": "ImageObject",
      url: `https://dreamly.art/dreams/${entry.canonicalSlug}/opengraph-image`,
      width: 1200,
      height: 630,
      caption: `${entry.title} — illustrated card for the ${entry.name} dream symbol`,
    },
    articleSection: category.label,
    keywords: entry.aliases.join(", "),
    isPartOf: entry.parentSlug
      ? { "@type": "CreativeWorkSeries", name: parent.title, url: `https://dreamly.art/dreams/${parent.slug}` }
      : { "@type": "CollectionPage", name: "Dream Dictionary", url: "https://dreamly.art/dreams" },
    author: { "@type": "Organization", name: "Dreamly" },
    publisher: { "@type": "Organization", name: "Dreamly", url: "https://dreamly.art" },
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
    { name: "Home", url: "https://dreamly.art/" },
    { name: "Dream Dictionary", url: "https://dreamly.art/dreams" },
    { name: category.label, url: `https://dreamly.art/dreams/categories/${entry.category}` },
    ...(entry.parentSlug ? [{ name: parent.title, url: `https://dreamly.art/dreams/${parent.slug}` }] : []),
    { name: entry.title, url: `https://dreamly.art/dreams/${entry.canonicalSlug}` },
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
          <Link href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
            <ArrowLeft size={14} aria-hidden="true" /> Dictionary
          </Link>
          {entry.parentSlug ? (
            <>
              <ChevronRight size={13} aria-hidden="true" />
              <Link href={`/dreams/${parent.slug}`} className="transition hover:text-[var(--dd-text)]">{parent.name}</Link>
            </>
          ) : null}
          <ChevronRight size={13} aria-hidden="true" />
          <span className="text-[var(--dd-muted)]">{entry.name}</span>
        </nav>

        <header className="relative mt-8 overflow-hidden rounded-[2rem] border border-[var(--dd-border)] bg-[var(--dd-surface)] px-6 py-10 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full blur-[85px]" style={{ backgroundColor: `${entry.accent}28` }} />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_190px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: entry.accent }}>
                  {entry.parentSlug ? "Dream variation" : "Parent dream symbol"}
                </p>
                <Link
                  href={`/dreams/categories/${entry.category}`}
                  className="rounded-full bg-[var(--dd-surface-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dd-subtle)] transition hover:text-[var(--dd-text)]"
                >
                  {category.label}
                </Link>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Main symbol</p>
                <p className="mt-1 text-sm font-semibold text-[var(--dd-text)]">{parent.title}</p>
              </div>
            </div>
            <Link href={`/dreams/${parent.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: entry.accent }}>
              View parent meaning <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </aside>
        ) : null}

        <section id="meaning" className="scroll-mt-24 py-12 sm:py-16">
          <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
            <div>
              <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                <BookOpenText size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Core symbol</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">General meaning</h2>
            </div>
            <div>
              <div className="space-y-5 text-[15px] leading-7 text-[var(--dd-text-soft)] sm:text-base sm:leading-8">
                {[...entry.sections.introduction, ...entry.sections.general].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <h3 className="mt-9 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--dd-subtle)]">Common scenarios</h3>
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
        </section>

        <section className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="variations-title">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
              <Link2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{entry.parentSlug ? "Sibling pages" : "Long-tail meanings"}</p>
              <h2 id="variations-title" className="mt-1.5 text-2xl font-semibold tracking-tight">
                {entry.parentSlug ? `Related ${parent.name} variations` : "Common variations of this dream"}
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedVariations.map((variation) => <EntryCard key={variation.slug} entry={variation} />)}
          </div>
        </section>

        <InterpretationSection id="psychology" eyebrow="The inner mind" title="Psychological interpretation" icon={Brain} accent={entry.accent} paragraphs={entry.sections.psychological} />
        <InterpretationSection id="spiritual" eyebrow="Personal meaning" title="Spiritual interpretation" icon={Sparkles} accent={entry.accent} paragraphs={entry.sections.spiritual} />
        <InterpretationSection id="islamic" eyebrow="Faith perspective" title="Islamic interpretation" icon={MoonStar} accent={entry.accent} paragraphs={entry.sections.islamic} />
        <InterpretationSection id="biblical" eyebrow="Faith perspective" title="Biblical interpretation" icon={LibraryBig} accent={entry.accent} paragraphs={entry.sections.biblical} />

        <section id="questions" className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
          <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
            <div>
              <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                <CircleHelp size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Popular questions</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">People also ask</h2>
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

        <section id="related" className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
          <div>
            <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
              <Compass size={21} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Cross-cluster links</p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">Related dream symbols</h2>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedSymbols.map((related) => <EntryCard key={related.slug} entry={related} label={related.parentSlug ? "Related variation" : "Related parent"} />)}
          </div>
        </section>

        {combos.length > 0 ? (
          <section className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="combos-title">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Combined symbols</p>
            <h2 id="combos-title" className="mt-1.5 text-2xl font-semibold tracking-tight">Combination dreams with {parent.name}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {combos.map((combo) => <EntryCard key={combo.slug} entry={combo} label="Combination" />)}
            </div>
          </section>
        ) : null}

        {categorySiblings.length > 0 ? (
          <section className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="category-siblings-title">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Same theme</p>
                <h2 id="category-siblings-title" className="mt-1.5 text-2xl font-semibold tracking-tight">More {category.label.toLowerCase()}</h2>
              </div>
              <Link href={`/dreams/categories/${entry.category}`} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: entry.accent }}>
                View all {category.label.toLowerCase()} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categorySiblings.map((sibling) => <EntryCard key={sibling.slug} entry={sibling} />)}
            </div>
          </section>
        ) : null}

        <nav className="border-t border-[var(--dd-border)] py-10 sm:py-14" aria-labelledby="continue-title">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Keep reading</p>
          <h2 id="continue-title" className="mt-1.5 text-2xl font-semibold tracking-tight">Continue exploring the dictionary</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {ringLinks.map((link) => (
              <Link
                key={link.slug}
                href={`/dreams/${link.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3.5 py-2 text-sm text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.title}
              </Link>
            ))}
            <Link
              href="/dreams/a-z"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--dd-border)] px-3.5 py-2 text-sm font-semibold text-[var(--dd-text-soft)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
            >
              Browse all symbols A–Z <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <aside className="rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          Dream meanings are a tool for reflection, not prediction or diagnosis. Religious sections summarize broad interpretive traditions and are not religious rulings.
        </aside>
      </article>
    </main>
  );
}
