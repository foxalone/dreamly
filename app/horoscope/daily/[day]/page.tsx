import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { earliestWorldDay, readFeatured, publicFeatured } from "@/lib/featuredHoroscope";
import { featuredCopy } from "@/lib/i18n/featured-horoscope";
import { horoscopeCopy } from "@/lib/i18n/horoscope";
import { localeMetadata } from "@/lib/i18n/page-locale";
import type { Locale } from "@/lib/i18n/config";
import { randomPublicDreams } from "@/lib/featuredDreamRecommendations";
import FeaturedArticleClient from "../FeaturedArticleClient";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ day: string }> };

export async function featuredMetadata(locale: Locale, day: string): Promise<Metadata> {
  const item = day <= earliestWorldDay() ? await readFeatured(day).catch(() => null) : null;
  if (!item) return { title: featuredCopy[locale].title };
  const path = `/horoscope/daily/${day}`;
  return {
    title: `${horoscopeCopy[locale].signs[item.sign]} · ${featuredCopy[locale].title} · ${day} | Dreamly`,
    description: item.teaser,
    ...localeMetadata(path, locale),
  };
}

export async function FeaturedPage({ locale, day }: { locale: Locale; day: string }) {
  const item = day <= earliestWorldDay() ? await readFeatured(day).catch(() => null) : null;
  if (!item) notFound();
  const dreams = await randomPublicDreams();
  return <FeaturedArticleClient locale={locale} forecast={publicFeatured(item)} dreams={dreams} />;
}

export async function generateMetadata({ params }: Props) { return featuredMetadata("en", (await params).day); }
export default async function Page({ params }: Props) { return <FeaturedPage locale="en" day={(await params).day} />; }
