import type { Metadata } from "next";
import TarotReadingView, { tarotReadingMetadata } from "../../TarotReadingView";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Props = { params: Promise<{ day: string; cardId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { day, cardId } = await params;
  return tarotReadingMetadata("en", day, cardId);
}

export default async function Page({ params }: Props) {
  const { day, cardId } = await params;
  return <TarotReadingView locale="en" day={day} cardId={cardId} />;
}
