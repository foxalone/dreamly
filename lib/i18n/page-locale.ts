import { notFound } from "next/navigation";
import { DEFAULT_LOCALE, type Locale, isPrefixLocale } from "./config";
import { languageAlternates, localePath } from "./path";

export async function localeFromParams(params: Promise<{ locale?: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!locale) return DEFAULT_LOCALE;
  if (!isPrefixLocale(locale)) notFound();
  return locale;
}

export function localeMetadata(unprefixedPath: string, locale: Locale) {
  return {
    alternates: {
      canonical: localePath(unprefixedPath, locale),
      languages: languageAlternates(unprefixedPath),
    },
  };
}

export function localeOpenGraph(
  unprefixedPath: string,
  locale: Locale,
  title: string,
  description: string,
  type: "website" | "article" = "website",
) {
  return {
    title,
    description,
    url: localePath(unprefixedPath, locale),
    type,
  };
}
