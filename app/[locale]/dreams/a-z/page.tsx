import type { Metadata } from "next";
import { AzIndexView } from "../../../dreams/CollectionHubViews";
import { getMessages } from "@/lib/i18n/messages";
import { localeFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = getMessages(locale);
  return {
    title: t.chrome.aToZTitle,
    description: t.chrome.aToZLead,
    ...localeMetadata("/dreams/a-z", locale),
    openGraph: localeOpenGraph("/dreams/a-z", locale, t.chrome.aToZTitle, t.chrome.aToZLead),
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  return <AzIndexView locale={locale} />;
}
