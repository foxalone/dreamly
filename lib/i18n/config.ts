export const LOCALES = ["en", "es", "ar", "pt", "de", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Locales that appear as a URL prefix. English stays unprefixed for SEO. */
export const PREFIX_LOCALES = ["es", "ar", "pt", "de", "ru"] as const;
export type PrefixLocale = (typeof PREFIX_LOCALES)[number];

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; htmlLang: string; dir: "ltr" | "rtl"; ogLocale: string }
> = {
  en: { label: "English", nativeLabel: "English", htmlLang: "en", dir: "ltr", ogLocale: "en_US" },
  es: { label: "Spanish", nativeLabel: "Español", htmlLang: "es", dir: "ltr", ogLocale: "es_419" },
  ar: { label: "Arabic", nativeLabel: "العربية", htmlLang: "ar", dir: "rtl", ogLocale: "ar_AR" },
  pt: { label: "Portuguese", nativeLabel: "Português", htmlLang: "pt", dir: "ltr", ogLocale: "pt_BR" },
  de: { label: "German", nativeLabel: "Deutsch", htmlLang: "de", dir: "ltr", ogLocale: "de_DE" },
  ru: { label: "Russian", nativeLabel: "Русский", htmlLang: "ru", dir: "ltr", ogLocale: "ru_RU" },
};

export const SITE_URL = "https://dreamly.art";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isPrefixLocale(value: string | undefined | null): value is PrefixLocale {
  return !!value && (PREFIX_LOCALES as readonly string[]).includes(value);
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}
