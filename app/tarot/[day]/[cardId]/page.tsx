import type { Metadata } from "next";
import TarotReadingView, { tarotReadingMetadata } from "../../TarotReadingView";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Props = { params: Promise<{ day: string; cardId: string }>; searchParams: Promise<{ back?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { day, cardId } = await params;
  return tarotReadingMetadata("en", day, cardId);
}

export default async function Page({ params, searchParams }: Props) {
  const { day, cardId } = await params;
  const { back } = await searchParams;
  return <TarotReadingView locale="en" day={day} cardId={cardId} back={back} />;
}
