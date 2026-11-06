import { notFound } from "next/navigation";
import { MAJOR_ARCANA, type MajorArcanaId } from "@/lib/tarot/deck";
import { TarotGuideCard, tarotCardMetadata } from "../../TarotGuide";

type Props = { params: Promise<{ cardId: string }> };

function validCardId(value: string): MajorArcanaId {
  const card = MAJOR_ARCANA.find(item => item.id === value);
  if (!card) notFound();
  return card.id;
}

export function generateStaticParams() {
  return MAJOR_ARCANA.map(card => ({ cardId: card.id }));
}

export async function generateMetadata({ params }: Props) {
  return tarotCardMetadata("en", validCardId((await params).cardId));
}

export default async function Page({ params }: Props) {
  return <TarotGuideCard locale="en" id={validCardId((await params).cardId)} />;
}
