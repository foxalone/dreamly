import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata } from "@/lib/i18n/page-locale";
import PricingView from "./PricingView";

const t = getMessages("en");

export const metadata: Metadata = {
  title: t.pricing.seoTitle,
  description: t.pricing.seoDescription,
  ...localeMetadata("/pricing", "en"),
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PricingView locale="en" />;
}
