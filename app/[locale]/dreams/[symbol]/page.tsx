import type { Metadata } from "next";
import { DREAM_SLUGS } from "@/lib/dream-dictionary";
import { DREAM_GUIDE_SLUGS } from "@/lib/dream-guides";
import { PREFIX_LOCALES } from "@/lib/i18n/config";
import { localeFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { getLocalizedGuide } from "@/lib/i18n/localize-guides";
import DreamGuidePage from "../../../dreams/DreamGuidePage";
import DreamSymbolView, { dreamSymbolMetadata } from "../../../dreams/DreamSymbolView";

type Props = { params: Promise<{ locale: string; symbol: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  const symbols = [...DREAM_SLUGS, ...DREAM_GUIDE_SLUGS];
  return PREFIX_LOCALES.flatMap((locale) => symbols.map((symbol) => ({ locale, symbol })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const { symbol } = await params;
  const guide = getLocalizedGuide(symbol, locale);
  if (guide) {
    return {
      title: guide.seoTitle,
      description: guide.seoDescription,
      ...localeMetadata(`/dreams/${guide.slug}`, locale),
      openGraph: localeOpenGraph(`/dreams/${guide.slug}`, locale, guide.seoTitle, guide.seoDescription, "article"),
    };
  }
  return dreamSymbolMetadata(symbol, locale);
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  const { symbol } = await params;
  const guide = getLocalizedGuide(symbol, locale);
  if (guide) return <DreamGuidePage guide={guide} locale={locale} />;
  return <DreamSymbolView symbol={symbol} locale={locale} />;
}
