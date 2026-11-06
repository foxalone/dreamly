import { TarotGuideHub, tarotHubMetadata } from "@/app/tarot/TarotGuide";
import { localeFromParams } from "@/lib/i18n/page-locale";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  return tarotHubMetadata(await localeFromParams(params));
}

export default async function Page({ params }: Props) {
  return <TarotGuideHub locale={await localeFromParams(params)} />;
}
