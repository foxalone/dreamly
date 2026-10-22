import type { Metadata } from "next";
import { localeMetadata } from "@/lib/i18n/page-locale";
import { moonMessages } from "@/lib/i18n/moon";
import MoonExperience from "./MoonExperience";

export const metadata: Metadata = {
  title: `${moonMessages.en.title} | Dreamly`,
  description: moonMessages.en.description,
  ...localeMetadata("/moon", "en"),
  robots: { index: false, follow: false },
};

export default function MoonPage() {
  return <MoonExperience locale="en" />;
}
