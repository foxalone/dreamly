import {
  DEFAULT_LOCALE,
  LOCALE_META,
  PREFIX_LOCALES,
  SITE_URL,
  type Locale,
  isPrefixLocale,
} from "./config";

const PREFIX_RE = /^\/(es|ar|pt|de|ru)(?=\/|$)/;

/** Paths that must never get a locale prefix. */
export function isLocaleExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/app/profile/admin-dashboard") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export function stripLocalePrefix(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(PREFIX_RE);
  if (!match) return { locale: DEFAULT_LOCALE, path: pathname || "/" };
  const locale = match[1] as Locale;
  const rest = pathname.slice(match[0].length) || "/";
  return { locale, path: rest };
}

export function localeFromPathname(pathname: string): Locale {
  return stripLocalePrefix(pathname).locale;
}

/**
 * Prefix an internal href for a locale.
 * English stays `/dreams/snake`. Spanish becomes `/es/dreams/snake`.
 */
export function localePath(href: string, locale: Locale): string {
  if (!href.startsWith("/")) return href;
  if (isLocaleExemptPath(href)) return href;
  const { path } = stripLocalePrefix(href);
  if (locale === DEFAULT_LOCALE) return path;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

export function absoluteLocaleUrl(path: string, locale: Locale): string {
  const prefixed = localePath(path, locale);
  return `${SITE_URL}${prefixed === "/" ? "/" : prefixed}`;
}

/** hreflang map for a canonical unprefixed path like `/dreams/snake`. */
export function languageAlternates(unprefixedPath: string): Record<string, string> {
  const path = stripLocalePrefix(unprefixedPath).path;
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(path, "en"),
    en: absoluteLocaleUrl(path, "en"),
  };
  for (const locale of PREFIX_LOCALES) {
    languages[LOCALE_META[locale].htmlLang] = absoluteLocaleUrl(path, locale);
  }
  return languages;
}

export function switchLocalePath(currentPathname: string, nextLocale: Locale): string {
  const { path } = stripLocalePrefix(currentPathname);
  return localePath(path, nextLocale);
}

export function parseLocaleParam(value: string | undefined): Locale | null {
  return isPrefixLocale(value) ? value : null;
}
