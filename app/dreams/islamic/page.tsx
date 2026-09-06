import type { Metadata } from "next";
import FaithHub from "../FaithHub";
import { getFaithCopy } from "@/lib/i18n/hubs";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

const copy = getFaithCopy("en", "islamic");

export const metadata: Metadata = {
  title: copy.seoTitle,
  description: copy.seoDescription,
  ...localeMetadata("/dreams/islamic", "en"),
  openGraph: localeOpenGraph("/dreams/islamic", "en", copy.seoTitle, copy.seoDescription),
};

export default function IslamicDreamMeaningsPage() {
  return <FaithHub slug="islamic" locale="en" />;
}
