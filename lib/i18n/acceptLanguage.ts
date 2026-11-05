import { browserLocale } from "./browser-language";
import { DEFAULT_LOCALE, type Locale } from "./config";

/** Choose the first supported browser language, respecting Accept-Language priorities. */
export function acceptLanguageLocale(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ordered = header.split(",").map((entry, index) => {
    const [language, ...parameters] = entry.trim().split(";");
    const quality = parameters.find(part => part.trim().toLowerCase().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { language, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0, index };
  }).filter(item => item.q > 0).sort((a, b) => b.q - a.q || a.index - b.index);
  return browserLocale(ordered.map(item => item.language)) ?? DEFAULT_LOCALE;
}
