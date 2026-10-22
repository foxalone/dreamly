import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import ArticleAdBanner from "@/app/components/ArticleAdBanner";

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
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - var(--app-nav-height, 4rem))", minHeight: 240, gap: 12 }} data-map-layout>
        <div style={{ flex: "1 1 0%", minHeight: 0, minWidth: 0 }}>{children}</div>
        <div style={{ flex: "0 0 auto", borderTop: "1px solid var(--border)", padding: "8px 16px calc(8px + env(safe-area-inset-bottom))", background: "var(--bg)" }}>
          <div style={{ maxWidth: 728, marginInline: "auto" }}>
            <ArticleAdBanner locale={locale} variant="map" slot={process.env.ADSENSE_ARTICLE_SLOT?.trim() || undefined} />
          </div>
        </div>
      </div>
    </>
  );
}
