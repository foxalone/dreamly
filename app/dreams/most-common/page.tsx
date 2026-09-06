import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { MostCommonView } from "../CollectionHubViews";

const t = getMessages("en");

export const metadata: Metadata = {
  title: "Most Common Dreams: Meanings of Snakes, Falling, Exes & More",
  description: t.chrome.mostCommonLead,
  ...localeMetadata("/dreams/most-common", "en"),
  openGraph: localeOpenGraph("/dreams/most-common", "en", t.chrome.mostCommonTitle, t.chrome.mostCommonLead),
};

export default function MostCommonDreamsPage() {
  return <MostCommonView locale="en" />;
}
