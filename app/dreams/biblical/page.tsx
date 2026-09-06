import type { Metadata } from "next";
import FaithHub from "../FaithHub";
import { getFaithCopy } from "@/lib/i18n/hubs";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

const copy = getFaithCopy("en", "biblical");

export const metadata: Metadata = {
  title: copy.seoTitle,
  description: copy.seoDescription,
  ...localeMetadata("/dreams/biblical", "en"),
  openGraph: localeOpenGraph("/dreams/biblical", "en", copy.seoTitle, copy.seoDescription),
};

export default function BiblicalDreamMeaningsPage() {
  return <FaithHub slug="biblical" locale="en" />;
}
