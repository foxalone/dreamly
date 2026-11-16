import type { Metadata } from "next";
import { MostCommonView } from "../../../dreams/CollectionHubViews";
import { getMessages } from "@/lib/i18n/messages";
import { dictionaryLocaleFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await dictionaryLocaleFromParams(params);
  const t = getMessages(locale);
  return {
    title: t.chrome.mostCommonTitle,
    description: t.chrome.mostCommonLead,
    ...localeMetadata("/dreams/most-common", locale),
    openGraph: localeOpenGraph("/dreams/most-common", locale, t.chrome.mostCommonTitle, t.chrome.mostCommonLead),
  };
}

export default async function Page({ params }: Props) {
  const locale = await dictionaryLocaleFromParams(params);
  return <MostCommonView locale={locale} />;
}
