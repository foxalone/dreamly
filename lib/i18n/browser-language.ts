import { isLocale, type Locale } from "./config";
import { isLocaleExemptPath, localeFromPathname, stripLocalePrefix, switchLocalePath } from "./path";

/** Use the first supported browser preference, including regional variants. */
export function browserLocale(languages: readonly string[]): Locale | null {
  for (const language of languages) {
    const base = language.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export function suggestedLanguagePath(pathname: string, preferred: Locale | null): string | null {
  if (!preferred || preferred === localeFromPathname(pathname)) return null;
  // Check the unprefixed path too: administrative pages never show this prompt.
  if (isLocaleExemptPath(stripLocalePrefix(pathname).path)) return null;
  return switchLocalePath(pathname, preferred);
}
