import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight, Layers3 } from "lucide-react";
import DreamSearch from "./DreamSearch";
import {
  ALL_DREAM_ENTRIES,
  DREAM_CATEGORIES,
  DREAM_DICTIONARY,
  PARENT_DREAMS,
  POPULAR_DREAM_SLUGS,
  getDreamsByCategory,
  type DreamCategory,
} from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: `Dream Dictionary: ${ALL_DREAM_ENTRIES.length} Symbols and Meanings | Dreamly`,
  description:
    "Search Dreamly's dream dictionary for psychological, spiritual, Islamic, and biblical meanings across popular symbols and long-tail dream variations.",
  alternates: { canonical: "/dreams" },
  openGraph: {
    title: "Dream Dictionary: Symbols, Variations and Meanings",
    description: "Explore connected dream symbol clusters, common variations, interpretations, and FAQs.",
    url: "/dreams",
    type: "website",
  },
};

const FEATURED_CATEGORIES: DreamCategory[] = [
  "animals",
  "body",
  "water",
  "life-events",
  "fear-nightmares",
];

function SymbolLinkGrid({ slugs }: { slugs: readonly string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {slugs.map((slug) => {
        const entry = DREAM_DICTIONARY[slug];
        if (!entry) return null;
        return (
          <Link
            key={slug}
            href={`/dreams/${slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-3.5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)] hover:bg-[var(--dd-surface-hover)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--dd-surface)] text-2xl" aria-hidden="true">{entry.icon}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--dd-text)]">{entry.title}</span>
            <ChevronRight size={15} className="shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

export default function DreamDictionaryPage() {
  const searchItems = ALL_DREAM_ENTRIES.map(({ slug, title, icon, aliases, category, parentSlug }) => ({
    slug,
    title,
    icon,
    aliases,
    category,
    parentSlug,
  }));

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dream Dictionary Symbols and Variations",
    numberOfItems: ALL_DREAM_ENTRIES.length,
    itemListElement: ALL_DREAM_ENTRIES.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.title,
      url: `https://dreamly.art/dreams/${entry.canonicalSlug}`,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <section className="relative overflow-visible border-b border-[var(--dd-border)] px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-violet-600/15 blur-[110px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs font-medium text-[var(--dd-accent-text)]">
            <BookOpen size={14} aria-hidden="true" />
            {ALL_DREAM_ENTRIES.length} meanings across {PARENT_DREAMS.length} dream clusters
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Dream Dictionary</h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">
            Search a symbol or explore connected variations through psychological, spiritual, Islamic, and biblical perspectives.
          </p>
          <DreamSearch items={searchItems} />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section aria-labelledby="popular-symbols-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dd-subtle)]">Start here</p>
              <h2 id="popular-symbols-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Popular symbols</h2>
            </div>
            <span className="hidden text-sm text-[var(--dd-subtle)] sm:block">Parent topics and long-tail meanings</span>
          </div>
          <nav className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12" aria-label="Popular dream meanings">
            {POPULAR_DREAM_SLUGS.map((slug) => {
              const entry = DREAM_DICTIONARY[slug];
              return (
                <Link
                  key={slug}
                  href={`/dreams/${slug}`}
                  className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-1 py-4 transition hover:-translate-y-1 hover:border-[var(--dd-border-strong)] hover:bg-[var(--dd-surface-hover)]"
                >
                  <span className="text-3xl transition group-hover:scale-110" aria-hidden="true">{entry.icon}</span>
                  <span className="max-w-full truncate text-[11px] font-medium text-[var(--dd-muted)] group-hover:text-[var(--dd-text)]">{entry.name}</span>
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="mt-14" aria-labelledby="categories-title">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dd-subtle)]">Browse by theme</p>
            <h2 id="categories-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Dream categories</h2>
          </div>
          <nav className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Dream categories">
            {(Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => {
              const info = DREAM_CATEGORIES[category];
              const count = ALL_DREAM_ENTRIES.filter((entry) => entry.category === category).length;
              return (
                <Link key={category} href={`/dreams/categories/${category}`} className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl" aria-hidden="true">{info.icon}</span>
                    <span className="rounded-full bg-[var(--dd-surface-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dd-subtle)]">{count} pages</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--dd-text)]">{info.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--dd-muted)]">{info.description}</p>
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="mt-14" aria-labelledby="parent-symbols-title">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-violet-500/10 text-[var(--dd-accent-text)]"><Layers3 size={19} aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dd-subtle)]">SEO clusters</p>
              <h2 id="parent-symbols-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Parent symbols</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PARENT_DREAMS.map((entry) => (
              <article key={entry.slug} className="rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-4xl" aria-hidden="true">{entry.icon}</span>
                  <span className="rounded-full bg-[var(--dd-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--dd-subtle)]">
                    {entry.variationSlugs.length} variations
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{entry.title}</h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--dd-muted)]">{entry.shortMeaning}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {entry.variationSlugs.slice(0, 3).map((slug) => (
                    <Link key={slug} href={`/dreams/${slug}`} className="rounded-full border border-[var(--dd-border)] px-2.5 py-1 text-[11px] text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]">
                      {DREAM_DICTIONARY[slug].name}
                    </Link>
                  ))}
                </div>
                <Link href={`/dreams/${entry.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: entry.accent }}>
                  Explore cluster <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6 sm:p-8" aria-labelledby="popular-meanings-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dd-subtle)]">Frequently explored</p>
              <h2 id="popular-meanings-title" className="mt-2 text-2xl font-semibold tracking-tight">Popular dream meanings</h2>
            </div>
            <ArrowRight className="hidden text-[var(--dd-faint)] sm:block" aria-hidden="true" />
          </div>
          <div className="mt-6">
            <SymbolLinkGrid slugs={["black-snake", "snake-bite", "teeth-falling-out", "drowning", "someone-dying", "crying-baby", "being-pregnant", "dog-bite", "black-cat", "falling-from-height", "chased-by-man", "car-accident"]} />
          </div>
        </section>

        {FEATURED_CATEGORIES.map((category) => {
          const info = DREAM_CATEGORIES[category];
          const parents = getDreamsByCategory(category);
          const slugs = parents.flatMap((parent) => [parent.slug, ...parent.variationSlugs.slice(0, 3)]);
          return (
            <section key={category} id={category} className="scroll-mt-24 border-t border-[var(--dd-border)] py-12 sm:py-16" aria-labelledby={`${category}-title`}>
              <div className="grid gap-7 lg:grid-cols-[270px_1fr] lg:gap-12">
                <div>
                  <span className="text-4xl" aria-hidden="true">{info.icon}</span>
                  <h2 id={`${category}-title`} className="mt-4 text-2xl font-semibold tracking-tight">{info.label}</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--dd-muted)]">{info.description}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dd-subtle)]">{slugs.length} featured meanings</p>
                </div>
                <SymbolLinkGrid slugs={slugs} />
              </div>
            </section>
          );
        })}

        <section id="places" className="scroll-mt-24 border-t border-[var(--dd-border)] pt-12 sm:pt-16">
          <div className="grid gap-3 sm:grid-cols-3">
            {(["places", "movement", "objects"] as DreamCategory[]).map((category) => {
              const info = DREAM_CATEGORIES[category];
              const parents = getDreamsByCategory(category);
              return (
                <div key={category} id={category === "places" ? undefined : category} className="scroll-mt-24 rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6">
                  <span className="text-3xl" aria-hidden="true">{info.icon}</span>
                  <h2 className="mt-4 text-xl font-semibold">{info.label}</h2>
                  <div className="mt-4 space-y-2">
                    {parents.map((entry) => (
                      <Link key={entry.slug} href={`/dreams/${entry.slug}`} className="flex items-center justify-between rounded-xl bg-[var(--dd-surface-soft)] px-3 py-2.5 text-sm text-[var(--dd-muted)] transition hover:bg-[var(--dd-surface-hover)] hover:text-[var(--dd-text)]">
                        {entry.title}<ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="mt-12 rounded-3xl border border-amber-400/20 bg-amber-300/[0.07] p-6 text-sm leading-6 text-[var(--dd-muted)] sm:p-8">
          <p className="font-semibold text-[var(--dd-text)]">A note about dream meanings</p>
          <p className="mt-2 max-w-4xl">Dream interpretation is reflective, not predictive. Meanings change with personal history, culture, faith, and emotion. Use these guides as questions to explore—not as medical, religious, or psychological diagnosis.</p>
        </aside>
      </div>
    </main>
  );
}
