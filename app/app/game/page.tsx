import type { Metadata } from "next";
import { ALL_DREAM_ENTRIES } from "@/lib/dream-dictionary";
import GameClient, { type Creature } from "./GameClient";

export const metadata: Metadata = {
  title: "Dream Kingdoms — Dreamly",
};

/** Extra non-animal dictionary symbols that read as dream creatures. */
const EXTRA_CREATURE_SLUGS = new Set(["angel", "ghost"]);

/**
 * Creature pool for the tap game: every top-level dictionary symbol in the "animals"
 * category (plus a few spiritual beings), so each creature links to its symbol page.
 * Built on the server so the 7k-line dictionary never ships to the client.
 */
function creaturePool(): Creature[] {
  return ALL_DREAM_ENTRIES.filter(
    (e) =>
      !e.parentSlug &&
      !e.comboOf &&
      (e.category === "animals" || EXTRA_CREATURE_SLUGS.has(e.slug))
  ).map((e) => ({
    emoji: e.icon,
    slug: e.slug,
    name: e.name,
    meaning: e.shortMeaning,
  }));
}

export default function GamePage() {
  return <GameClient pool={creaturePool()} />;
}
