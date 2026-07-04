import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { DREAM_CATEGORIES, DREAM_DICTIONARY, MOST_COMMON_DREAM_SLUGS } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: "Most Common Dreams and What They Mean | Dreamly",
  description:
    "The most common dreams people search for — snakes, teeth falling out, being chased, falling, flying, an ex, pregnancy — with psychological, spiritual, Islamic, and biblical meanings.",
  alternates: { canonical: "/dreams/most-common" },
  openGraph: {
    title: "Most Common Dreams and What They Mean",
    description: "The dreams people have (and search) most often, explained.",
    url: "/dreams/most-common",
    type: "website",
  },
};

export default function MostCommonDreamsPage() {
  const entries = MOST_COMMON_DREAM_SLUGS.map((slug) => DREAM_DICTIONARY[slug]).filter(Boolean);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Most Common Dreams",
    url: "https://dreamly.art/dreams/most-common",
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: "https://dreamly.art" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.title,
        url: `https://dreamly.art/dreams/${entry.canonicalSlug}`,
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      <div className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--dd-subtle)] sm:text-sm">
          <Link href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
            <ArrowLeft size={14} aria-hidden="true" /> Dictionary
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="text-[var(--dd-muted)]">Most common dreams</span>
        </nav>

        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">The Most Common Dreams</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">
            Certain dreams show up across cultures, ages, and eras: teeth crumbling, a snake in the grass, running from something you never quite see.
            Researchers call these typical dreams, and they tend to track universal human concerns — safety, loss, exposure, attachment, and change.
            Below are the dreams people report and search for most, each linked to a full interpretation.
          </p>
        </header>

        <ol className="mt-10 space-y-4">
          {entries.map((entry, index) => (
            <li key={entry.slug}>
              <Link
                href={`/dreams/${entry.slug}`}
                className="group flex items-start gap-5 rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
              >
                <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--dd-surface-soft)] text-sm font-bold text-[var(--dd-subtle)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{entry.icon}</span>
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--dd-text)]">{entry.title}</h2>
                    <span className="rounded-full bg-[var(--dd-surface-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dd-subtle)]">
                      {DREAM_CATEGORIES[entry.category].label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--dd-muted)]">{entry.shortMeaning}</p>
                </div>
                <ArrowRight size={16} className="mt-2 shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm leading-7 text-[var(--dd-muted)]">
          Looking for something more specific? Browse the{" "}
          <Link href="/dreams/a-z" className="font-semibold text-[var(--dd-accent-text)] hover:underline">full A–Z index</Link>{" "}
          or search the <Link href="/dreams" className="font-semibold text-[var(--dd-accent-text)] hover:underline">dream dictionary</Link>.
        </p>
      </div>
    </main>
  );
}
