import type { MetadataRoute } from "next";
import { ALL_DREAM_ENTRIES } from "@/lib/dream-dictionary";

const SITE = "https://dreamly.art";

// Bump when the homepage content materially changes.
const HOME_UPDATED_AT = "2026-07-02";

export default function sitemap(): MetadataRoute.Sitemap {
  // The dictionary hub changes whenever any entry does.
  const dictionaryUpdatedAt = ALL_DREAM_ENTRIES.reduce(
    (latest, entry) => (entry.updatedAt > latest ? entry.updatedAt : latest),
    "",
  );

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
    // Client-rendered app shells: kept discoverable but demoted, no fake lastmod.
    {
      url: `${SITE}/app/shared`,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${SITE}/app/map`,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    {
      url: `${SITE}/invite`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const dictionary: MetadataRoute.Sitemap = ALL_DREAM_ENTRIES.map((entry) => ({
    url: `${SITE}/dreams/${entry.canonicalSlug}`,
    lastModified: entry.updatedAt,
    changeFrequency: "monthly",
    priority: entry.parentSlug ? 0.7 : 0.8,
  }));

  return [...core, ...dictionary];
}
