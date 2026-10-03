import type { Metadata } from "next";
import { DREAM_DICTIONARY } from "@/lib/dream-dictionary";
import { CREATURE_TIERS } from "@/lib/game/creatureTiers";
import GameClient, { type Creature } from "./GameClient";

export const metadata: Metadata = {
  title: "Dream Kingdoms — Dreamly",
};

/**
 * Creature pool for the tap game, from the tier table (lib/game/creatureTiers.ts).
 * Every creature is a dictionary symbol, so its card links to its symbol page.
 * Built on the server so the dictionary never ships to the client.
 */
function creaturePool(): Creature[] {
  return CREATURE_TIERS.flatMap((t) =>
    t.slugs
      .map((slug) => DREAM_DICTIONARY[slug])
      .filter((e) => Boolean(e))
      .map((e) => ({
        emoji: e.icon,
        slug: e.slug,
        name: e.name.replace(/^(a|an|the) /i, ""),
        meaning: e.shortMeaning,
        tier: t.tier,
      }))
  );
}

export default function GamePage() {
  return <GameClient pool={creaturePool()} />;
}
