import type { Metadata } from "next";
import { NightmaresView } from "../../../dreams/CollectionHubViews";
import { getMessages } from "@/lib/i18n/messages";
import { dictionaryLocaleFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await dictionaryLocaleFromParams(params);
  const t = getMessages(locale);
  return {
    title: t.chrome.nightmaresTitle,
    description: t.chrome.nightmaresLead,
    ...localeMetadata("/dreams/nightmares", locale),
    openGraph: localeOpenGraph("/dreams/nightmares", locale, t.chrome.nightmaresTitle, t.chrome.nightmaresLead),
  };
}

export default async function Page({ params }: Props) {
  const locale = await dictionaryLocaleFromParams(params);
  return <NightmaresView locale={locale} />;
}
