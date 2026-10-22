import type { Metadata } from "next";
import { localeFromParams, localeMetadata } from "@/lib/i18n/page-locale";
import { moonMessages } from "@/lib/i18n/moon";
import MoonExperience from "@/app/moon/MoonExperience";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const m = moonMessages[locale];
  return { title: `${m.title} | Dreamly`, description: m.description, ...localeMetadata("/moon", locale), robots: { index: false, follow: false } };
}

export default async function MoonPage({ params }: Props) {
  return <MoonExperience locale={await localeFromParams(params)} />;
}
