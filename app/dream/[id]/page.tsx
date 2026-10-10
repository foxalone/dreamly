import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import DreamPublicView, { loadSharedDream, sharedDreamMetadata } from "../DreamPublicView";

// Each dream page is cached and refreshed every 5 minutes; reactions and
// comments stay live via the client island.
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const dream = await loadSharedDream(id);
  if (!dream) return { robots: { index: false, follow: false } };
  return sharedDreamMetadata(dream, id, DEFAULT_LOCALE);
}

export default async function DreamPage({ params }: Props) {
  const { id } = await params;
  const dream = await loadSharedDream(id);
  if (!dream) notFound();
  return <DreamPublicView dream={dream} locale={DEFAULT_LOCALE} />;
}
