import type { Metadata } from "next";
import HomeView, { homeMetadata } from "../HomeView";
import { localeFromParams, localeMetadata } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  return { ...homeMetadata(locale), ...localeMetadata("/", locale) };
}

export default async function LocaleHomePage({ params }: Props) {
  const locale = await localeFromParams(params);
  return <HomeView locale={locale} />;
}
