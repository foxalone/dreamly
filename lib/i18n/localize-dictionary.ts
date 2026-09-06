import {
  ALL_DREAM_ENTRIES,
  DREAM_DICTIONARY,
  type DreamEntry,
} from "@/lib/dream-dictionary";
import type { Locale } from "./config";
import { getSeedL10n } from "./seeds";
import {
  localizedAliases,
  localizedSeoDescription,
  localizedSeoTitle,
  localizedShortMeaning,
  localizedTitle,
  makeLocalizedSections,
} from "./templates";

const cache = new Map<Locale, DreamEntry[]>();
const bySlugCache = new Map<Locale, Record<string, DreamEntry>>();

function localizeOne(entry: DreamEntry, locale: Locale): DreamEntry {
  const seed = getSeedL10n(locale, entry.slug);
  const parentSeed = entry.parentSlug ? getSeedL10n(locale, entry.parentSlug) : undefined;
  const name = seed?.name ?? entry.name;
  const summary = seed?.summary ?? seed?.focus ?? entry.shortMeaning.replace(/\.+$/, "");
  const focus = seed?.focus;
  const title = localizedTitle(locale, name);
  const parentName = parentSeed?.name ?? (entry.parentSlug ? DREAM_DICTIONARY[entry.parentSlug]?.name : undefined);

  const variationSeeds = (entry.parentSlug ? [] : entry.variationSlugs)
    .map((slug) => {
      const v = getSeedL10n(locale, slug);
      const en = DREAM_DICTIONARY[slug];
      if (!en) return null;
      return { name: v?.name ?? en.name, focus: v?.focus ?? en.shortMeaning.replace(/\.+$/, "") };
    })
    .filter((row): row is { name: string; focus: string } => Boolean(row));

  const hook = focus ?? summary;
  return {
    ...entry,
    name,
    title,
    shortMeaning: localizedShortMeaning(locale, hook),
    seoTitle: localizedSeoTitle(locale, name, hook),
    seoDescription: localizedSeoDescription(locale, name, hook),
    aliases: localizedAliases(locale, name, seed?.aliases ?? []),
    sections: makeLocalizedSections(locale, {
      title,
      name,
      category: entry.category,
      summary: parentSeed?.summary ?? summary,
      focus,
      parentName,
      variationSeeds: variationSeeds.length ? variationSeeds : undefined,
    }),
  };
}

export function getLocalizedEntries(locale: Locale): DreamEntry[] {
  if (locale === "en") return ALL_DREAM_ENTRIES;
  const hit = cache.get(locale);
  if (hit) return hit;
  const entries = ALL_DREAM_ENTRIES.map((entry) => localizeOne(entry, locale));
  cache.set(locale, entries);
  return entries;
}

export function getLocalizedDictionary(locale: Locale): Record<string, DreamEntry> {
  if (locale === "en") return DREAM_DICTIONARY;
  const hit = bySlugCache.get(locale);
  if (hit) return hit;
  const map = Object.fromEntries(getLocalizedEntries(locale).map((entry) => [entry.slug, entry]));
  bySlugCache.set(locale, map);
  return map;
}

export function getLocalizedEntry(slug: string, locale: Locale): DreamEntry | undefined {
  return getLocalizedDictionary(locale)[slug];
}

export function getLocalizedParents(locale: Locale): DreamEntry[] {
  return getLocalizedEntries(locale).filter((entry) => !entry.parentSlug);
}

export function localizeEntryList(entries: DreamEntry[], locale: Locale): DreamEntry[] {
  if (locale === "en") return entries;
  const dict = getLocalizedDictionary(locale);
  return entries.map((entry) => dict[entry.slug]).filter((row): row is DreamEntry => Boolean(row));
}
