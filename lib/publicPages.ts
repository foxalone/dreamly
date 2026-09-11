import { ALL_DREAM_ENTRIES, DREAM_CATEGORIES, type DreamCategory } from "@/lib/dream-dictionary";
import { LOCALES } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";

export const SITE_ORIGIN = "https://dreamly.art";

/** Bump when the homepage content materially changes. */
export const HOME_UPDATED_AT = "2026-07-02";

export const LEGAL_UPDATED_AT = "2026-09-06";

export const HUB_PATHS = [
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
  "/dreams/how-to-interpret-dreams",
  "/dreams/vivid-dreams",
  "/dreams/night-terrors",
  "/dreams/anxiety-dreams",
  "/dreams/visitation-dreams",
  "/dreams/shared-dreams",
  "/dreams/dream-incubation",
  "/dreams/how-to-stop-nightmares",
  "/dreams/hypnagogic-hallucinations",
  "/dreams/erotic-dreams",
  "/dreams/biblical",
  "/dreams/islamic",
  "/dreams/spiritual",
] as const;

export type PublicPage = {
  url: string;
  lastModified?: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
  /** English dictionary slugs used by sitemap image lookup. */
  slug?: string;
  canonicalSlug?: string;
};

function localizedUrls(path: string): string[] {
  return LOCALES.map((locale) => `${SITE_ORIGIN}${localePath(path, locale)}`);
}

export function dictionaryUpdatedAt(): string {
  return ALL_DREAM_ENTRIES.reduce((latest, entry) => (entry.updatedAt > latest ? entry.updatedAt : latest), "");
}

/** Public, indexable pages — same inventory as sitemap.xml (without images). */
export function listPublicPages(): PublicPage[] {
  const dictionaryDate = dictionaryUpdatedAt();
  const categoryPaths = (Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map(
    (category) => `/dreams/categories/${category}`,
  );

  const core: PublicPage[] = [
    ...localizedUrls("/").map((url) => ({
      url,
      lastModified: HOME_UPDATED_AT,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    })),
    ...localizedUrls("/dreams").map((url) => ({
      url,
      lastModified: dictionaryDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...localizedUrls("/gallery").map((url) => ({
      url,
      lastModified: dictionaryDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...localizedUrls("/privacy").map((url) => ({
      url,
      lastModified: LEGAL_UPDATED_AT,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...localizedUrls("/terms").map((url) => ({
      url,
      lastModified: LEGAL_UPDATED_AT,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...localizedUrls("/refund").map((url) => ({
      url,
      lastModified: LEGAL_UPDATED_AT,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...localizedUrls("/pricing").map((url) => ({
      url,
      lastModified: LEGAL_UPDATED_AT,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...localizedUrls("/invite").map((url) => ({
      url,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  const hubs: PublicPage[] = [...HUB_PATHS, ...categoryPaths].flatMap((path) =>
    localizedUrls(path).map((url) => ({
      url,
      lastModified: dictionaryDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  const dictionary: PublicPage[] = ALL_DREAM_ENTRIES.flatMap((entry) =>
    localizedUrls(`/dreams/${entry.canonicalSlug}`).map((url) => ({
      url,
      lastModified: entry.updatedAt,
      changeFrequency: "monthly" as const,
      priority: entry.parentSlug ? 0.7 : 0.8,
      slug: entry.slug,
      canonicalSlug: entry.canonicalSlug,
    })),
  );

  return [...core, ...hubs, ...dictionary];
}
