import type { Metadata } from "next";
import { loveCompatibilityCopy } from "@/lib/i18n/love-compatibility";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import LoveCompatibilityView from "./LoveCompatibilityView";

export const dynamic = "force-dynamic";
const copy = loveCompatibilityCopy.en;
export const metadata: Metadata = {
  title: copy.seoTitle,
  description: copy.seoDescription,
  ...localeMetadata("/love-compatibility", "en"),
  openGraph: localeOpenGraph("/love-compatibility", "en", copy.seoTitle, copy.seoDescription),
};

export default function Page() {
  return <LoveCompatibilityView locale="en" today={new Date().toISOString().slice(0, 10)} />;
}
