import type { Metadata } from "next";
import HomeView, { homeMetadata } from "./HomeView";
import { localeMetadata } from "@/lib/i18n/page-locale";

export const metadata: Metadata = {
  ...homeMetadata("en"),
  ...localeMetadata("/", "en"),
  keywords: [
    "dream meaning ai",
    "what does my dream mean ai",
    "ai dream interpreter",
    "dreamly ai",
    "dreamly",
    "dream dictionary",
    "dream meaning",
  ],
};

export default function HomePage() {
  return <HomeView locale="en" />;
}
