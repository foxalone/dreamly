import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { NightmaresView } from "../CollectionHubViews";

const t = getMessages("en");

export const metadata: Metadata = {
  title: "Nightmare Meaning: Why Bad Dreams Happen & How to Read Them",
  description: t.chrome.nightmaresLead,
  ...localeMetadata("/dreams/nightmares", "en"),
  openGraph: localeOpenGraph("/dreams/nightmares", "en", t.chrome.nightmaresTitle, t.chrome.nightmaresLead),
};

export default function NightmaresDictionaryPage() {
  return <NightmaresView locale="en" />;
}
