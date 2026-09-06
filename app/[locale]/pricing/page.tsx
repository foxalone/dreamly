import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { localeFromParams, localeMetadata } from "@/lib/i18n/page-locale";
import PricingView from "../../pricing/PricingView";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = getMessages(locale);
  return {
    title: t.pricing.seoTitle,
    description: t.pricing.seoDescription,
    ...localeMetadata("/pricing", locale),
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  return <PricingView locale={locale} />;
}
