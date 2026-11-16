import type { DictionaryLocale, Locale } from "../config";
import type { SeedL10n } from "./types";
import { SEEDS_ES } from "./es";
import { SEEDS_AR } from "./ar";
import { SEEDS_PT } from "./pt";
import { SEEDS_DE } from "./de";
import { SEEDS_RU } from "./ru";

const ALL: Record<Exclude<DictionaryLocale, "en">, Record<string, SeedL10n>> = {
  es: SEEDS_ES,
  ar: SEEDS_AR,
  pt: SEEDS_PT,
  de: SEEDS_DE,
  ru: SEEDS_RU,
};

export function getSeedL10n(locale: Locale, slug: string): SeedL10n | undefined {
  if (locale === "en" || locale === "ja") return undefined;
  return ALL[locale][slug];
}
