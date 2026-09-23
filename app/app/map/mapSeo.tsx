import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

/**
 * /app/map is the one public page under /app: it is linked from the homepage
 * as a feature and needs no sign-in. The /app layout marks everything noindex,
 * so the map's nested layouts re-open indexing for this path only and give the
 * client-only Mapbox page a server-rendered title, description and heading.
 * (GSC 2026-09-22: "Excluded by 'noindex' tag" for https://dreamly.art/app/map.)
 */
export function mapMetadata(locale: Locale): Metadata {
  const t = getMessages(locale);
  const title = `${t.home.mapTitle} — Dreamly`;
  return {
    title,
    description: t.home.mapBody,
    ...localeMetadata("/app/map", locale),
    openGraph: localeOpenGraph("/app/map", locale, title, t.home.mapBody),
    robots: { index: true, follow: true },
  };
}

export function MapShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const t = getMessages(locale);
  return (
    <>
      <h1 className="sr-only">{t.home.mapTitle}</h1>
      <p className="sr-only">{t.home.mapBody}</p>
      {children}
    </>
  );
}
