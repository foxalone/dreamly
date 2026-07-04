import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import {
  ALL_DREAM_ENTRIES,
  DREAM_CATEGORIES,
  DREAM_DICTIONARY,
  getAllEntriesByCategory,
  getDreamsByCategory,
  type DreamCategory,
} from "@/lib/dream-dictionary";

type PageProps = { params: Promise<{ category: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return (Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => ({ category }));
}

function isDreamCategory(value: string): value is DreamCategory {
  return value in DREAM_CATEGORIES;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isDreamCategory(category)) return {};
  const info = DREAM_CATEGORIES[category];
  const count = getAllEntriesByCategory(category).length;
  const title = `${info.label}: ${count} Meanings & Interpretations | Dreamly`;
  const description = `${info.label} explained — ${info.description} Explore ${count} symbols and variations with psychological, spiritual, Islamic, and biblical meanings.`;
  return {
    title,
    description,
    alternates: { canonical: `/dreams/categories/${category}` },
    openGraph: { title, description, url: `/dreams/categories/${category}`, type: "website" },
  };
}

export default async function DreamCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!isDreamCategory(category)) notFound();

  const info = DREAM_CATEGORIES[category];
  const parents = getDreamsByCategory(category);
  const allEntries = getAllEntriesByCategory(category);
  const otherCategories = (Object.keys(DREAM_CATEGORIES) as DreamCategory[]).filter((c) => c !== category);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: info.label,
    description: info.description,
    url: `https://dreamly.art/dreams/categories/${category}`,
    isPartOf: { "@type": "WebSite", name: "Dreamly", url: "https://dreamly.art" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: allEntries.length,
      itemListElement: allEntries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.title,
        url: `https://dreamly.art/dreams/${entry.canonicalSlug}`,
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://dreamly.art/" },
      { "@type": "ListItem", position: 2, name: "Dream Dictionary", item: "https://dreamly.art/dreams" },
      { "@type": "ListItem", position: 3, name: info.label, item: `https://dreamly.art/dreams/categories/${category}` },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--dd-subtle)] sm:text-sm">
          <Link href="/dreams" className="inline-flex items-center gap-2 transition hover:text-[var(--dd-text)]">
            <ArrowLeft size={14} aria-hidden="true" /> Dictionary
          </Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="text-[var(--dd-muted)]">{info.label}</span>
        </nav>

        <header className="mt-8 rounded-[2rem] border border-[var(--dd-border)] bg-[var(--dd-surface)] px-6 py-10 sm:px-10 sm:py-14">
          <span className="text-5xl" aria-hidden="true">{info.icon}</span>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{info.label}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">{info.description}</p>
          <p className="mt-3 text-sm text-[var(--dd-subtle)]">
            {parents.length} parent symbols · {allEntries.length} total meanings
          </p>
        </header>

        <section className="mt-10 space-y-10" aria-label={`All ${info.label.toLowerCase()}`}>
          {parents.map((parent) => (
            <article key={parent.slug} className="rounded-3xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl" aria-hidden="true">{parent.icon}</span>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      <Link href={`/dreams/${parent.slug}`} className="transition hover:text-[var(--dd-accent-text)]">{parent.title}</Link>
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--dd-muted)]">{parent.shortMeaning}</p>
                  </div>
                </div>
                <Link href={`/dreams/${parent.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: parent.accent }}>
                  Full meaning <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {parent.variationSlugs.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {parent.variationSlugs.map((slug) => {
                    const variation = DREAM_DICTIONARY[slug];
                    if (!variation) return null;
                    return (
                      <Link
                        key={slug}
                        href={`/dreams/${slug}`}
                        className="rounded-full border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] px-3 py-1.5 text-xs text-[var(--dd-muted)] transition hover:border-[var(--dd-border-strong)] hover:text-[var(--dd-text)]"
                      >
                        {variation.name}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </article>
          ))}
        </section>

        <nav className="mt-14 border-t border-[var(--dd-border)] pt-10" aria-labelledby="other-categories-title">
          <h2 id="other-categories-title" className="text-2xl font-semibold tracking-tight">Explore other dream categories</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {otherCategories.map((slug) => {
              const other = DREAM_CATEGORIES[slug];
              const count = ALL_DREAM_ENTRIES.filter((entry) => entry.category === slug).length;
              return (
                <Link
                  key={slug}
                  href={`/dreams/categories/${slug}`}
                  className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)]"
                >
                  <span className="text-2xl" aria-hidden="true">{other.icon}</span>
                  <p className="mt-2 text-sm font-semibold text-[var(--dd-text)]">{other.label}</p>
                  <p className="mt-1 text-xs text-[var(--dd-subtle)]">{count} meanings</p>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
