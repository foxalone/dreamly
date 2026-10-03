import type { Locale } from "@/lib/i18n/config";
import { getLocalizedEntry } from "@/lib/i18n/localize-dictionary";
import { CREATURE_TIERS } from "@/lib/game/creatureTiers";
import GameClient, { type Creature } from "./GameClient";

/** Leading articles the dictionary keeps in names ("a beaver", "un escorpión", "ein Biber"). */
const ARTICLE = /^(a|an|the|un|una|um|uma|ein|eine|einen)\s+/i;

/** The dictionary's English shortMeaning is Title Cased ("Home And Nourishment, …"); the card reads it as a sentence. */
function sentenceCase(text: string): string {
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Creature pool for the tap game, from the tier table (lib/game/creatureTiers.ts), in the page's
 * language. Every creature is a dictionary symbol, so its card links to its symbol page.
 * Built on the server so the dictionary never ships to the client.
 */
function creaturePool(locale: Locale): Creature[] {
  return CREATURE_TIERS.flatMap((t) =>
    t.slugs
      .map((slug) => getLocalizedEntry(slug, locale))
      .filter((e) => Boolean(e))
      .map((e) => ({
        emoji: e!.icon,
        slug: e!.slug,
        name: e!.name.replace(ARTICLE, ""),
        meaning: locale === "en" ? sentenceCase(e!.shortMeaning) : e!.shortMeaning,
        tier: t.tier,
      }))
  );
}

export default function GamePage({ locale }: { locale: Locale }) {
  return <GameClient pool={creaturePool(locale)} />;
}
