import type { Metadata } from "next";
import TarotReadingView, { tarotReadingMetadata } from "@/app/tarot/TarotReadingView";
import { localeFromParams } from "@/lib/i18n/page-locale";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Props = { params: Promise<{ locale: string; day: string; cardId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, day, cardId } = await params;
  return tarotReadingMetadata(await localeFromParams(Promise.resolve({ locale })), day, cardId);
}

export default async function Page({ params }: Props) {
  const { locale, day, cardId } = await params;
  return <TarotReadingView locale={await localeFromParams(Promise.resolve({ locale }))} day={day} cardId={cardId} />;
}
