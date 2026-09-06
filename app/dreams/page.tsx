import type { Metadata } from "next";
import { ALL_DREAM_ENTRIES } from "@/lib/dream-dictionary";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { getMessages } from "@/lib/i18n/messages";
import DreamHubView from "./DreamHubView";

const t = getMessages("en");

export const metadata: Metadata = {
  title: `Dream Dictionary: ${ALL_DREAM_ENTRIES.length} Symbols, Meanings & Interpretations`,
  description: t.dictionary.lead,
  ...localeMetadata("/dreams", "en"),
  openGraph: localeOpenGraph("/dreams", "en", t.dictionary.h1, t.dictionary.lead),
};

export default function DreamDictionaryPage() {
  return <DreamHubView locale="en" />;
}
