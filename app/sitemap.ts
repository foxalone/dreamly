import type { MetadataRoute } from "next";
import { ALL_DREAM_ENTRIES, DREAM_CATEGORIES, type DreamCategory } from "@/lib/dream-dictionary";
import { listDreamPageImageUrls } from "@/lib/getDreamPageImage";

const SITE = "https://dreamly.art";

// Bump when the homepage content materially changes.
const HOME_UPDATED_AT = "2026-07-02";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The dictionary hub changes whenever any entry does.
  const dictionaryUpdatedAt = ALL_DREAM_ENTRIES.reduce(
    (latest, entry) => (entry.updatedAt > latest ? entry.updatedAt : latest),
    "",
  );
  const imageBySlug = await listDreamPageImageUrls();

  const core: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/`,
      lastModified: HOME_UPDATED_AT,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE}/dreams`,
      lastModified: dictionaryUpdatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/privacy`,
      lastModified: "2026-08-12",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}/terms`,
      lastModified: "2026-08-12",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Interactive /app routes are explicitly noindex and do not belong here.
    {
      url: `${SITE}/invite`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const hubs: MetadataRoute.Sitemap = [
    "/dreams/a-z",
    "/dreams/most-common",
    "/dreams/nightmares",
    "/dreams/why-we-dream",
    "/dreams/recurring-dreams",
    "/dreams/lucid-dreams",
    "/dreams/false-awakening",
    "/dreams/sleep-paralysis",
    "/dreams/types-of-dreams",
    "/dreams/prophetic-dreams",
    "/dreams/healing-dreams",
    "/dreams/remembering-dreams",
    "/dreams/children-and-dreams",
    "/dreams/dream-theorists",
    "/dreams/biblical",
    "/dreams/islamic",
    "/dreams/spiritual",
    ...(Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => `/dreams/categories/${category}`),
  ].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: dictionaryUpdatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const dictionary: MetadataRoute.Sitemap = ALL_DREAM_ENTRIES.map((entry) => {
    const imageUrl = imageBySlug.get(entry.slug) || imageBySlug.get(entry.canonicalSlug);
    return {
      url: `${SITE}/dreams/${entry.canonicalSlug}`,
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: entry.parentSlug ? 0.7 : 0.8,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    };
  });

  return [...core, ...hubs, ...dictionary];
}
