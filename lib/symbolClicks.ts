/**
 * Dictionary icon-click analytics: which symbol icons people click to open an explanation.
 * Pure helpers shared by the client tracker, the logging API and the admin tab.
 */

export const SYMBOL_CLICK_SOURCES = [
  "home",
  "dictionary",
  "search",
  "symbol",
  "guide",
  "collection",
  "other",
] as const;
export type SymbolClickSource = (typeof SYMBOL_CLICK_SOURCES)[number];

export const SYMBOL_CLICK_SOURCE_LABELS: Record<SymbolClickSource, string> = {
  home: "Home",
  dictionary: "Dictionary hub",
  search: "Search results",
  symbol: "Symbol page",
  guide: "Guide page",
  collection: "Collections",
  other: "Other",
};

const LOCALE_PREFIX_RE = /^\/(es|ar|pt|de|ru)(?=\/|$)/;

/** Strip the locale prefix and trailing slash: "/ru/dreams/snake/" → { locale: "ru", path: "/dreams/snake" }. */
export function splitLocalePath(pathname: string): { locale: string; path: string } {
  const raw = String(pathname || "/").split(/[?#]/)[0] || "/";
  const match = raw.match(LOCALE_PREFIX_RE);
  const locale = match ? match[1] : "en";
  let path = match ? raw.slice(match[0].length) || "/" : raw;
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  return { locale, path };
}

/** "/dreams/snake" (any locale) → "snake"; anything deeper or elsewhere → null. */
export function symbolSlugFromPath(pathname: string): string | null {
  const { path } = splitLocalePath(pathname);
  const match = path.match(/^\/dreams\/([a-z0-9][a-z0-9-]{0,119})$/);
  return match ? match[1] : null;
}

/** Where the click happened, from the page path the visitor was on. */
export function classifySymbolClickSource(
  fromPath: string,
  opts: {
    inSearch?: boolean;
    isSymbol: (slug: string) => boolean;
    isGuide: (slug: string) => boolean;
  },
): SymbolClickSource {
  if (opts.inSearch) return "search";
  const { path } = splitLocalePath(fromPath);
  if (path === "/") return "home";
  if (path === "/dreams") return "dictionary";
  const slug = symbolSlugFromPath(path);
  if (slug && opts.isSymbol(slug)) return "symbol";
  if (slug && opts.isGuide(slug)) return "guide";
  if (path.startsWith("/dreams/")) return "collection";
  return "other";
}

/** UTC day key used for the daily counter docs. */
export function symbolClickDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The last `days` UTC day keys, newest first, ending at `now`. */
export function symbolClickDayKeys(now: Date, days: number): string[] {
  const out: string[] = [];
  const n = Math.max(1, Math.min(90, Math.trunc(days) || 1));
  for (let i = 0; i < n; i += 1) {
    out.push(symbolClickDayKey(new Date(now.getTime() - i * 86_400_000)));
  }
  return out;
}
