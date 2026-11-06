import type { Metadata } from "next";
import { loveCompatibilityCopy } from "@/lib/i18n/love-compatibility";
import { localeFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import LoveCompatibilityView from "@/app/love-compatibility/LoveCompatibilityView";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const copy = loveCompatibilityCopy[locale];
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    ...localeMetadata("/love-compatibility", locale),
    openGraph: localeOpenGraph("/love-compatibility", locale, copy.seoTitle, copy.seoDescription),
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  return <LoveCompatibilityView locale={locale} today={new Date().toISOString().slice(0, 10)} />;
}
