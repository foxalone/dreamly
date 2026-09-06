import type { Metadata } from "next";
import DreamGuidePage from "../DreamGuidePage";
import { getLocalizedGuide } from "@/lib/i18n/localize-guides";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";

const GUIDE = getLocalizedGuide("remembering-dreams", "en")!;

export const metadata: Metadata = {
  title: GUIDE.seoTitle,
  description: GUIDE.seoDescription,
  ...localeMetadata(`/dreams/${GUIDE.slug}`, "en"),
  openGraph: localeOpenGraph(`/dreams/${GUIDE.slug}`, "en", GUIDE.seoTitle, GUIDE.seoDescription, "article"),
};

export default function Page() {
  return <DreamGuidePage guide={GUIDE} locale="en" />;
}
