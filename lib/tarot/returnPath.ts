import { SITE_URL, type Locale } from "@/lib/i18n/config";
import { localePath, stripLocalePrefix } from "@/lib/i18n/path";

const SITE_ORIGIN = new URL(SITE_URL).origin;

/** Keep the reading's Back link on this site, even when its query is edited. */
export function tarotReturnPath(value: unknown, locale: Locale): string {
  const fallback = localePath("/app/shared", locale);
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, SITE_URL);
    if (url.origin !== SITE_ORIGIN || stripLocalePrefix(url.pathname).path.startsWith("/ad/unlock")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
