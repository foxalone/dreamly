import type { Metadata } from "next";
import { ALL_DREAM_ENTRIES } from "@/lib/dream-dictionary";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { AzIndexView } from "../CollectionHubViews";

const t = getMessages("en");

export const metadata: Metadata = {
  title: `Dream Dictionary A–Z: All ${ALL_DREAM_ENTRIES.length} Symbols & Meanings`,
  description: t.chrome.aToZLead,
  ...localeMetadata("/dreams/a-z", "en"),
  openGraph: localeOpenGraph("/dreams/a-z", "en", t.chrome.aToZTitle, t.chrome.aToZLead),
};

export default function DreamAtoZPage() {
  return <AzIndexView locale="en" />;
}
