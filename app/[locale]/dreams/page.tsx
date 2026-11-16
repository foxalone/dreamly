import type { Metadata } from "next";
import DreamHubView from "../../dreams/DreamHubView";
import { getMessages } from "@/lib/i18n/messages";
import { dictionaryLocaleFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await dictionaryLocaleFromParams(params);
  const t = getMessages(locale);
  return {
    title: t.dictionary.h1,
    description: t.dictionary.lead,
    ...localeMetadata("/dreams", locale),
    openGraph: localeOpenGraph("/dreams", locale, t.dictionary.h1, t.dictionary.lead),
  };
}

export default async function Page({ params }: Props) {
  const locale = await dictionaryLocaleFromParams(params);
  return <DreamHubView locale={locale} />;
}
