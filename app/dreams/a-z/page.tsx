import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ALL_DREAM_ENTRIES } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: `Dream Dictionary A–Z: All ${ALL_DREAM_ENTRIES.length} Dream Meanings | Dreamly`,
  description:
    "Browse every dream meaning on Dreamly alphabetically — parent symbols, long-tail variations, and combination dreams with psychological, spiritual, Islamic, and biblical interpretations.",
  alternates: { canonical: "/dreams/a-z" },
  openGraph: {
    title: "Dream Dictionary A–Z: Every Dream Meaning",
    description: "The complete alphabetical index of dream symbols, variations, and combination dreams.",
    url: "/dreams/a-z",
    type: "website",
  },
};

export default function DreamAtoZPage() {
  const sorted = [...ALL_DREAM_ENTRIES].sort((a, b) => a.title.localeCompare(b.title));
  const groups = new Map<string, typeof sorted>();
  for (const entry of sorted) {
    const letter = entry.title[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(entry);
  }
  const letters = [...groups.keys()];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Dream Dictionary A–Z",
    url: "https://dreamly.art/dreams/a-z",
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: "https://dreamly.art" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sorted.length,
      itemListElement: sorted.map((entry, index) => ({
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
          <span className="text-[var(--dd-muted)]">A–Z index</span>
        </nav>

        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Dream Dictionary A–Z</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--dd-muted)]">
            Every meaning on Dreamly in one alphabetical index — {sorted.length} dream symbols, variations, and combinations.
          </p>
        </header>

        <nav className="mt-8 flex flex-wrap gap-1.5" aria-label="Jump to letter">
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
          <section key={letter} id={`letter-${letter}`} className="mt-10 scroll-mt-24" aria-label={`Dream meanings starting with ${letter}`}>
            <h2 className="border-b border-[var(--dd-border)] pb-3 text-2xl font-semibold tracking-tight">{letter}</h2>
            <ul className="mt-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {groups.get(letter)!.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/dreams/${entry.slug}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--dd-muted)] transition hover:bg-[var(--dd-surface-soft)] hover:text-[var(--dd-text)]"
                  >
                    <span aria-hidden="true">{entry.icon}</span>
                    <span className="truncate">{entry.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
