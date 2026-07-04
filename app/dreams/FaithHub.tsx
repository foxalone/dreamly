import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { DREAM_CATEGORIES, PARENT_DREAMS } from "@/lib/dream-dictionary";

export type FaithHubConfig = {
  slug: "biblical" | "islamic" | "spiritual";
  heading: string;
  anchor: string;
  intro: string[];
  perspectiveLabel: string;
};

export default function FaithHub({ config }: { config: FaithHubConfig }) {
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.heading,
    url: `https://dreamly.art/dreams/${config.slug}`,
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: "https://dreamly.art" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: PARENT_DREAMS.length,
      itemListElement: PARENT_DREAMS.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${entry.title} — ${config.perspectiveLabel}`,
        url: `https://dreamly.art/dreams/${entry.canonicalSlug}#${config.anchor}`,
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://dreamly.art/" },
      { "@type": "ListItem", position: 2, name: "Dream Dictionary", item: "https://dreamly.art/dreams" },
      { "@type": "ListItem", position: 3, name: config.heading, item: `https://dreamly.art/dreams/${config.slug}` },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--dd-subtle)] sm:text-sm">
          <Link href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
            <ArrowLeft size={14} aria-hidden="true" /> Dictionary
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="text-[var(--dd-muted)]">{config.heading}</span>
        </nav>

        <header className="mt-8">
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{config.heading}</h1>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">
            {config.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </header>

        <section className="mt-10" aria-label={`${config.perspectiveLabel} by symbol`}>
          <h2 className="text-2xl font-semibold tracking-tight">Browse by symbol</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PARENT_DREAMS.map((entry) => (
              <Link
                key={entry.slug}
                href={`/dreams/${entry.slug}#${config.anchor}`}
                className="group flex items-start gap-4 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
              >
                <span className="text-3xl" aria-hidden="true">{entry.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-[var(--dd-text)]">{entry.title}</span>
                    <ArrowRight size={15} className="shrink-0 text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-xs text-[var(--dd-subtle)]">{DREAM_CATEGORIES[entry.category].label}</span>
                  <span className="mt-2 block text-sm leading-6 text-[var(--dd-muted)]">{entry.shortMeaning}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="mt-12 rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          These pages summarize broad interpretive traditions for reflection. They are not religious rulings, and a dream should never replace
          scripture, scholarship, prayer, or sound practical judgment.
        </aside>
      </div>
    </main>
  );
}
