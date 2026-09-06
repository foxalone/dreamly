import type { Metadata } from "next";
import FaithHub from "../../../dreams/FaithHub";
import { getFaithCopy } from "@/lib/i18n/hubs";
import { localeFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const copy = getFaithCopy(locale, "spiritual");
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    ...localeMetadata("/dreams/spiritual", locale),
    openGraph: localeOpenGraph("/dreams/spiritual", locale, copy.seoTitle, copy.seoDescription),
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  return <FaithHub slug="spiritual" locale={locale} />;
}
