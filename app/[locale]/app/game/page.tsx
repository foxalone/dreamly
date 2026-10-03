import type { Metadata } from "next";
import { localeFromParams } from "@/lib/i18n/page-locale";
import { getMessages } from "@/lib/i18n/messages";
import GamePage from "../../../app/game/GamePage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  return { title: `${getMessages(locale).game.title} — Dreamly` };
}

export default async function Page({ params }: Props) {
  return <GamePage locale={await localeFromParams(params)} />;
}
