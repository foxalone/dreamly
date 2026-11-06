import { notFound } from "next/navigation";
import { TarotGuideCard, tarotCardMetadata } from "@/app/tarot/TarotGuide";
import { PREFIX_LOCALES } from "@/lib/i18n/config";
import { localeFromParams } from "@/lib/i18n/page-locale";
import { MAJOR_ARCANA, type MajorArcanaId } from "@/lib/tarot/deck";

type Props = { params: Promise<{ locale: string; cardId: string }> };

function validCardId(value: string): MajorArcanaId {
  const card = MAJOR_ARCANA.find(item => item.id === value);
  if (!card) notFound();
  return card.id;
}

export function generateStaticParams() {
  return PREFIX_LOCALES.flatMap(locale => MAJOR_ARCANA.map(card => ({ locale, cardId: card.id })));
}

export async function generateMetadata({ params }: Props) {
  const { locale, cardId } = await params;
  return tarotCardMetadata(await localeFromParams(Promise.resolve({ locale })), validCardId(cardId));
}

export default async function Page({ params }: Props) {
  const { locale, cardId } = await params;
  return <TarotGuideCard locale={await localeFromParams(Promise.resolve({ locale }))} id={validCardId(cardId)} />;
}
