import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { localeFromParams } from "@/lib/i18n/page-locale";
import DreamPublicView, { loadSharedDream, sharedDreamMetadata } from "../../../dream/DreamPublicView";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const { id } = await params;
  const dream = await loadSharedDream(id);
  if (!dream) return { robots: { index: false, follow: false } };
  return sharedDreamMetadata(dream, id, locale);
}

export default async function LocaleDreamPage({ params }: Props) {
  const locale = await localeFromParams(params);
  const { id } = await params;
  const dream = await loadSharedDream(id);
  if (!dream) notFound();
  return <DreamPublicView dream={dream} locale={locale} />;
}
