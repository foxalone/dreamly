import type { Metadata } from "next";
import { DREAM_SLUGS } from "@/lib/dream-dictionary";
import DreamSymbolView, { dreamSymbolMetadata } from "../DreamSymbolView";

type PageProps = { params: Promise<{ symbol: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return DREAM_SLUGS.map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  return dreamSymbolMetadata(symbol, "en");
}

export default async function DreamSymbolPage({ params }: PageProps) {
  const { symbol } = await params;
  return <DreamSymbolView symbol={symbol} locale="en" />;
}
