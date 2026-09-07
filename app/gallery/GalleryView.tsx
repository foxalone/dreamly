import {
  DREAM_PAGE_IMAGE_HEIGHT,
  DREAM_PAGE_IMAGE_WIDTH,
  sortDreamPageImages,
  type DreamPageImageAssignment,
} from "@/lib/dreamPageImage";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedEntry } from "@/lib/i18n/localize-dictionary";
import { formatMessage, getMessages } from "@/lib/i18n/messages";
import { absoluteLocaleUrl } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";
import SiteLegalFooter from "@/app/components/SiteLegalFooter";

export default function GalleryView({
  locale,
  images,
}: {
  locale: Locale;
  images: DreamPageImageAssignment[];
}) {
  const t = getMessages(locale);
  const items = sortDreamPageImages(images).flatMap((image) => {
    const entry = getLocalizedEntry(image.slug, locale);
    if (!entry) return [];
    return [
      {
        ...image,
        title: entry.title,
        alt: formatMessage(t.gallery.alt, { name: entry.name || entry.title }),
      },
    ];
  });

  const pageUrl = absoluteLocaleUrl("/gallery", locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t.gallery.h1,
    description: t.gallery.lead,
    url: pageUrl,
    inLanguage: locale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.slice(0, 60).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteLocaleUrl(`/dreams/${item.slug}`, locale),
        name: item.title,
        image: item.imageUrl,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{t.nav.gallery}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--dd-text)] sm:text-4xl">{t.gallery.h1}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--dd-muted)] sm:text-lg">{t.gallery.lead}</p>
      </header>

      {items.length === 0 ? (
        <p className="mx-auto mt-16 max-w-md text-center text-sm leading-6 text-[var(--dd-muted)]">{t.gallery.empty}</p>
      ) : (
        <section className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label={t.gallery.h1}>
          {items.map((item) => (
            <LocaleLink
              key={item.slug}
              href={`/dreams/${item.slug}`}
              className="group block overflow-hidden rounded-[1.15rem] bg-[var(--dd-surface-soft)] ring-1 ring-[var(--dd-border)] transition hover:-translate-y-0.5 hover:ring-[var(--dd-border-strong)] sm:rounded-[1.35rem]"
            >
              <span className="relative block">
                <img
                  src={item.imageUrl}
                  alt={item.alt}
                  width={DREAM_PAGE_IMAGE_WIDTH}
                  height={DREAM_PAGE_IMAGE_HEIGHT}
                  loading="lazy"
                  className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pb-3 pt-10">
                  <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/75">{t.gallery.openMeaning}</span>
                </span>
              </span>
            </LocaleLink>
          ))}
        </section>
      )}
    </main>
      <SiteLegalFooter locale={locale} />
    </div>
  );
}
