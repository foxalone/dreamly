import { localeFromParams } from "@/lib/i18n/page-locale";
import GamePage from "../../../../app/game/GamePage";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <GamePage locale={await localeFromParams(params)} android />;
}
