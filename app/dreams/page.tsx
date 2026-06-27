import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, ChevronDown, Search } from "lucide-react";
import { DREAM_DICTIONARY, DREAM_SLUGS } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: "Dream Dictionary: Symbols and Meanings | Dreamly",
  description:
    "Explore common dream symbols through psychological, spiritual, Islamic, and biblical perspectives. Start with snakes, water, flying, babies, death, teeth, and dogs.",
  alternates: { canonical: "/dreams" },
  openGraph: {
    title: "Dream Dictionary: Symbols and Meanings",
    description: "A thoughtful guide to the symbols that appear in your dreams.",
    url: "/dreams",
    type: "website",
  },
};

export default function DreamDictionaryPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dream Dictionary Symbols",
    itemListElement: DREAM_SLUGS.map((slug, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${DREAM_DICTIONARY[slug].symbol} dream meaning`,
      url: `https://dreamly.art/dreams/${slug}`,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <section className="relative overflow-hidden border-b border-[var(--dd-border)] px-5 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-80 max-w-3xl rounded-full bg-violet-600/15 blur-[110px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs font-medium text-[var(--dd-accent-text)]">
            <BookOpen size={14} aria-hidden="true" />
            Decode the language of your dreams
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Dream Dictionary
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">
            Explore what familiar dream symbols may reveal about your emotions, inner life, and beliefs—without treating them as fixed predictions.
          </p>

          <div className="mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-4 py-3 text-left text-sm text-[var(--dd-subtle)]">
            <Search size={17} className="shrink-0 text-[var(--dd-accent-text)]" aria-hidden="true" />
            <span>Choose a symbol below to begin</span>
            <ChevronDown size={16} className="ml-auto" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14" aria-labelledby="symbol-nav-title">
        <h2 id="symbol-nav-title" className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[var(--dd-subtle)]">
          Jump to a symbol
        </h2>
        <nav className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Dream symbols">
          {DREAM_SLUGS.map((slug) => {
            const entry = DREAM_DICTIONARY[slug];
            return (
              <a
                key={slug}
                href={`#${slug}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-2 py-4 transition hover:-translate-y-1 hover:border-[var(--dd-border-strong)] hover:bg-[var(--dd-surface-hover)]"
              >
                <span className="text-3xl transition group-hover:scale-110" aria-hidden="true">{entry.emoji}</span>
                <span className="text-xs font-medium text-[var(--dd-muted)] group-hover:text-[var(--dd-text)]">{entry.symbol}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-12 space-y-4">
          {DREAM_SLUGS.map((slug, index) => {
            const entry = DREAM_DICTIONARY[slug];
            return (
              <article
                key={slug}
                id={slug}
                className="scroll-mt-28 overflow-hidden rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)]"
              >
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <div
                    className="flex min-h-40 items-center justify-center border-b border-[var(--dd-border)] md:min-h-56 md:border-b-0 md:border-r"
                    style={{ background: `radial-gradient(circle at 50% 45%, ${entry.accent}24, transparent 65%)` }}
                  >
                    <span className="text-7xl drop-shadow-2xl" aria-hidden="true">{entry.emoji}</span>
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Symbol {String(index + 1).padStart(2, "0")}</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{entry.symbol} dream meaning</h3>
                      </div>
                      <span className="mt-1 hidden size-2 shrink-0 rounded-full sm:block" style={{ backgroundColor: entry.accent }} />
                    </div>
                    <p className="mt-4 max-w-2xl leading-7 text-[var(--dd-muted)]">{entry.shortMeaning}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {entry.scenarios.slice(0, 3).map((scenario) => (
                        <span key={scenario.title} className="rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3 py-1.5 text-xs text-[var(--dd-muted)]">
                          {scenario.title}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/dreams/${slug}`}
                      className="mt-7 inline-flex items-center gap-2 text-sm font-semibold transition hover:gap-3"
                      style={{ color: entry.accent }}
                    >
                      Read the full interpretation <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="mt-12 rounded-3xl border border-amber-400/20 bg-amber-300/[0.07] p-6 text-sm leading-6 text-[var(--dd-muted)] sm:p-8">
          <p className="font-semibold text-[var(--dd-text)]">A note about dream meanings</p>
          <p className="mt-2 max-w-4xl">
            Dream interpretation is reflective, not predictive. Meanings change with personal history, culture, faith, and emotion. Use these guides as questions to explore—not as medical, religious, or psychological diagnosis.
          </p>
        </aside>
      </section>
    </main>
  );
}
