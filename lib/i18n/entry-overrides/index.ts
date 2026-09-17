import type { Locale } from "../config";
import type { EntryL10nOverride } from "./types";
import { ENTRY_OVERRIDES_AR } from "./ar";
import { ENTRY_OVERRIDES_DE } from "./de";
import { ENTRY_OVERRIDES_ES } from "./es";
import { ENTRY_OVERRIDES_PT } from "./pt";
import { ENTRY_OVERRIDES_RU } from "./ru";

export const ENTRY_OVERRIDES: Record<Exclude<Locale, "en">, Record<string, EntryL10nOverride>> = {
  es: ENTRY_OVERRIDES_ES,
  ar: ENTRY_OVERRIDES_AR,
  pt: ENTRY_OVERRIDES_PT,
  de: ENTRY_OVERRIDES_DE,
  ru: ENTRY_OVERRIDES_RU,
};

export function getEntryOverride(locale: Locale, slug: string): EntryL10nOverride | undefined {
  if (locale === "en") return undefined;
  return ENTRY_OVERRIDES[locale][slug];
}
