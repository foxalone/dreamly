import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n/path";
import { jaPilotAlternate } from "@/lib/jaPilotPaths";

export function japaneseMetadata(path: string, title: string, description: string, type: "website" | "article" = "website"): Metadata {
  const canonical = jaPilotAlternate(path);
  return {
    title,
    description,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: { title, description, url: canonical, locale: "ja_JP", siteName: "Dreamly", type },
  };
}
