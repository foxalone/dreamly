import type { Metadata } from "next";
import FaithHub from "../FaithHub";
import { getFaithCopy } from "@/lib/i18n/hubs";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

const copy = getFaithCopy("en", "spiritual");

export const metadata: Metadata = {
  title: copy.seoTitle,
  description: copy.seoDescription,
  ...localeMetadata("/dreams/spiritual", "en"),
  openGraph: localeOpenGraph("/dreams/spiritual", "en", copy.seoTitle, copy.seoDescription),
};

export default function SpiritualDreamMeaningsPage() {
  return <FaithHub slug="spiritual" locale="en" />;
}
