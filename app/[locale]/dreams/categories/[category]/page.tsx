import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DREAM_CATEGORIES, getAllEntriesByCategory, type DreamCategory } from "@/lib/dream-dictionary";
import { PREFIX_LOCALES } from "@/lib/i18n/config";
import { getCategoryCopy } from "@/lib/i18n/categories";
import { localeFromParams, localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { CategoryHubView } from "../../../../dreams/CollectionHubViews";

type Props = { params: Promise<{ locale: string; category: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PREFIX_LOCALES.flatMap((locale) =>
    (Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => ({ locale, category })),
  );
}

function isDreamCategory(value: string): value is DreamCategory {
  return value in DREAM_CATEGORIES;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const { category } = await params;
  if (!isDreamCategory(category)) return {};
  const info = getCategoryCopy(locale, category);
  const count = getAllEntriesByCategory(category).length;
  const title = `${info.label} · ${count}`;
  return {
    title,
    description: info.description,
    ...localeMetadata(`/dreams/categories/${category}`, locale),
    openGraph: localeOpenGraph(`/dreams/categories/${category}`, locale, title, info.description),
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  const { category } = await params;
  if (!isDreamCategory(category)) notFound();
  return <CategoryHubView locale={locale} category={category} />;
}
