import type { Metadata } from "next";
import FaithHub from "../../../dreams/FaithHub";
import { getFaithCopy } from "@/lib/i18n/hubs";
import { dictionaryLocaleFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await dictionaryLocaleFromParams(params);
  const copy = getFaithCopy(locale, "islamic");
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    ...localeMetadata("/dreams/islamic", locale),
    openGraph: localeOpenGraph("/dreams/islamic", locale, copy.seoTitle, copy.seoDescription),
  };
}

export default async function Page({ params }: Props) {
  const locale = await dictionaryLocaleFromParams(params);
  return <FaithHub slug="islamic" locale={locale} />;
}
