// Dream emoji → game creature. A dream's emoji escapes as exactly that creature when a
// chapter-1 creature of the game uses the same dictionary icon (🦊 → fox, 🐍 → snake);
// everything else escapes as a nameless creature and lands as a random open kind.
// Server-only: pulls the dream dictionary, which never ships to the client.

import { DREAM_DICTIONARY } from "@/lib/dream-dictionary";
import { CHAPTER1_SLUGS } from "@/lib/game/creatureTiers";
import { ESCAPE_MAX } from "@/lib/game/escape";

/** Compare emojis without the variation selector (🐍︎ vs 🐍). */
const strip = (s: string) => s.replace(/️/g, "");

let iconToSlug: Map<string, string> | null = null;

function buildMap(): Map<string, string> {
  if (!iconToSlug) {
    iconToSlug = new Map();
    for (const slug of CHAPTER1_SLUGS) {
      const icon = DREAM_DICTIONARY[slug]?.icon;
      if (icon) iconToSlug.set(strip(icon), slug);
    }
  }
  return iconToSlug;
}

export function matchEscapes(emojis: Array<{ native?: string } | null | undefined>): { slug: string | null; native: string }[] {
  const map = buildMap();
  return (emojis ?? [])
    .map((e) => (typeof e?.native === "string" ? e.native.trim() : ""))
    .filter(Boolean)
    .slice(0, ESCAPE_MAX)
    .map((native) => ({ native, slug: map.get(strip(native)) ?? null }));
}
