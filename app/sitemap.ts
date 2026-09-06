import type { MetadataRoute } from "next";
import { ALL_DREAM_ENTRIES, DREAM_CATEGORIES, type DreamCategory } from "@/lib/dream-dictionary";
import { listDreamPageImageUrls } from "@/lib/getDreamPageImage";
import { LOCALES } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";

const SITE = "https://dreamly.art";

function localizedUrls(path: string): string[] {
  return LOCALES.map((locale) => `${SITE}${localePath(path, locale)}`);
}

/** Next.js writes image:loc as raw text; unescaped `&` in Storage URLs makes the XML invalid for GSC. */
function xmlSafeImageUrl(url: string): string {
  return url.replace(/&/g, "&amp;");
}

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
    ...localizedUrls("/").map((url) => ({
      url,
      lastModified: HOME_UPDATED_AT,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    })),
    ...localizedUrls("/dreams").map((url) => ({
      url,
      lastModified: dictionaryUpdatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...localizedUrls("/gallery").map((url) => ({
      url,
      lastModified: dictionaryUpdatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...localizedUrls("/privacy").map((url) => ({
      url,
      lastModified: "2026-08-12",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...localizedUrls("/terms").map((url) => ({
      url,
      lastModified: "2026-08-12",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    // Interactive /app routes are explicitly noindex and do not belong here.
    ...localizedUrls("/invite").map((url) => ({
      url,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
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
  ].flatMap((path) =>
    localizedUrls(path).map((url) => ({
      url,
      lastModified: dictionaryUpdatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  const dictionary: MetadataRoute.Sitemap = ALL_DREAM_ENTRIES.flatMap((entry) => {
    const imageUrl = imageBySlug.get(entry.slug) || imageBySlug.get(entry.canonicalSlug);
    return localizedUrls(`/dreams/${entry.canonicalSlug}`).map((url) => ({
      url,
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: entry.parentSlug ? 0.7 : 0.8,
      ...(imageUrl ? { images: [xmlSafeImageUrl(imageUrl)] } : {}),
    }));
  });

  return [...core, ...hubs, ...dictionary];
}
