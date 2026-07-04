import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { DREAM_DICTIONARY, getAllEntriesByCategory, type DreamEntry } from "@/lib/dream-dictionary";

const SCARY_SYMBOL_SLUGS = [
  "being-chased",
  "falling",
  "being-naked",
  "demon",
  "ghost",
  "snake-bite",
  "dog-bite",
  "shark-attack",
  "drowning",
  "being-killed",
  "car-accident",
  "tornado-coming",
  "haunted-house",
  "burning-house",
  "chased-by-monster",
  "spider-bite",
  "alligator-attack",
  "earthquake",
  "storm-at-sea",
  "fire",
] as const;

export const metadata: Metadata = {
  title: "Nightmares Dictionary: Common Bad Dreams Explained | Dreamly",
  description:
    "Why nightmares happen and what the most common ones mean — being chased, falling, drowning, demons, attacks, and disasters — with grounded, non-alarmist interpretations.",
  alternates: { canonical: "/dreams/nightmares" },
  openGraph: {
    title: "Nightmares Dictionary: Common Bad Dreams Explained",
    description: "The most common nightmares and what they usually reflect.",
    url: "/dreams/nightmares",
    type: "website",
  },
};

function NightmareCard({ entry }: { entry: DreamEntry }) {
  return (
    <Link
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
    </Link>
  );
}

export default function NightmaresDictionaryPage() {
  const fearEntries = getAllEntriesByCategory("fear-nightmares");
  const scaryEntries = SCARY_SYMBOL_SLUGS.map((slug) => DREAM_DICTIONARY[slug]).filter(Boolean);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nightmares Dictionary",
    url: "https://dreamly.art/dreams/nightmares",
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: "https://dreamly.art" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: scaryEntries.length + fearEntries.length,
      itemListElement: [...scaryEntries, ...fearEntries].map((entry, index) => ({
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
          <span className="text-[var(--dd-muted)]">Nightmares</span>
        </nav>

        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Nightmares Dictionary</h1>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">
            <p>
              Nightmares are the mind rehearsing under pressure. They cluster around stress, unprocessed events, sleep disruption, and unresolved
              worry — which is why the same handful of frightening scenarios repeats across almost everyone: being chased, falling, drowning,
              exposure, attack, and disaster.
            </p>
            <p>
              A nightmare is rarely a prediction and never a diagnosis. Read as a signal, it usually points to a specific fear that wants
              attention. The entries below cover the most common frightening dreams, each with a calm, grounded interpretation.
            </p>
          </div>
        </header>

        <section className="mt-10" aria-labelledby="common-nightmares-title">
          <h2 id="common-nightmares-title" className="text-2xl font-semibold tracking-tight">Most common nightmares</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {scaryEntries.map((entry) => <NightmareCard key={entry.slug} entry={entry} />)}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--dd-border)] pt-10" aria-labelledby="fear-category-title">
          <h2 id="fear-category-title" className="text-2xl font-semibold tracking-tight">All fear & nightmare meanings</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {fearEntries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/dreams/${entry.slug}`}
                className="rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3.5 py-2 text-sm text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
              >
                {entry.title}
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-[var(--dd-muted)]">
            See also the full <Link href="/dreams/categories/fear-nightmares" className="font-semibold text-[var(--dd-accent-text)] hover:underline">fear & nightmare category</Link>{" "}
            and the <Link href="/dreams/a-z" className="font-semibold text-[var(--dd-accent-text)] hover:underline">A–Z index</Link>.
          </p>
        </section>

        <aside className="mt-12 rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          Frequent, distressing nightmares that affect sleep or daily life are worth discussing with a doctor or therapist — effective,
          well-studied treatments exist. These pages are for reflection, not diagnosis.
        </aside>
      </div>
    </main>
  );
}
