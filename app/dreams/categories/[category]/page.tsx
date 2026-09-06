import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DREAM_CATEGORIES, getAllEntriesByCategory, type DreamCategory } from "@/lib/dream-dictionary";
import { getCategoryCopy } from "@/lib/i18n/categories";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { CategoryHubView } from "../../CollectionHubViews";

type PageProps = { params: Promise<{ category: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return (Object.keys(DREAM_CATEGORIES) as DreamCategory[]).map((category) => ({ category }));
}

function isDreamCategory(value: string): value is DreamCategory {
  return value in DREAM_CATEGORIES;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isDreamCategory(category)) return {};
  const info = getCategoryCopy("en", category);
  const count = getAllEntriesByCategory(category).length;
  const title = `${info.label}: ${count} Meanings, Symbols & Interpretations`;
  const description = info.description;
  return {
    title,
    description,
    ...localeMetadata(`/dreams/categories/${category}`, "en"),
    openGraph: localeOpenGraph(`/dreams/categories/${category}`, "en", title, description),
  };
}

export default async function DreamCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!isDreamCategory(category)) notFound();
  return <CategoryHubView locale="en" category={category} />;
}
