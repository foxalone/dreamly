/**
 * Dream Kingdoms — which creatures can come out of the dream catcher, and when.
 * Every creature is a top-level dream-dictionary symbol (slug), so its card links to /dreams/<slug>.
 * A tier opens once the player has caught `unlockAt` creatures in total (lifetime, all kinds).
 * Thresholds re-balanced 2026-10-03 for building copies (simulation: tier 6 ≈ day 13 active /
 * day 20 regular / day 39 casual).
 *
 * Chapter 2 (tiers 7–9: places, things, nature, people, spirits from the dictionary) stays
 * completely hidden until the player has caught every chapter-1 creature — then the puzzle
 * "grows" and the new symbols start coming out.
 * Rules doc: Admin → Game (app/app/profile/admin-dashboard/DreamKingdomsDoc.tsx).
 */

export type CreatureTier = { tier: number; unlockAt: number; slugs: string[] };

export const CREATURE_TIERS: CreatureTier[] = [
  {
    tier: 1,
    unlockAt: 0,
    slugs: ["dog", "cat", "fish", "bird", "rabbit", "frog", "cow", "goat", "horse", "chicken", "sheep", "pig", "snail", "ladybug", "butterfly", "insects"],
  },
  {
    tier: 2,
    unlockAt: 150,
    slugs: ["deer", "fox", "owl", "rat", "beaver", "turtle", "penguin", "parrot", "swan", "peacock", "panda", "monkey", "camel", "giraffe", "crab", "worm"],
  },
  {
    tier: 3,
    unlockAt: 5_000,
    slugs: ["elephant", "dolphin", "bat", "lizard", "octopus", "eagle", "whale", "spider", "snake", "wolf", "bear"],
  },
  { tier: 4, unlockAt: 100_000, slugs: ["lion", "tiger", "shark", "alligator", "scorpion", "dinosaur"] },
  { tier: 5, unlockAt: 2_000_000, slugs: ["ghost", "angel", "unicorn", "fairy", "mermaid"] },
  { tier: 6, unlockAt: 30_000_000, slugs: ["dragon", "phoenix", "genie", "wizard"] },
  // ── Chapter 2: hidden until all of chapter 1 is collected ──
  {
    tier: 7,
    unlockAt: 30_000_000,
    slugs: ["house", "tree", "flowers", "sun", "moon", "door", "keys", "shoes", "clothes", "ring", "phone", "mirror", "car", "boat", "train", "water"],
  },
  {
    tier: 8,
    unlockAt: 100_000_000,
    slugs: ["school", "hospital", "hotel", "airport", "beach", "forest", "stairs", "elevator", "tunnel", "swimming", "flying", "crawling", "eating", "hands", "eyes", "hair"],
  },
  {
    tier: 9,
    unlockAt: 300_000_000,
    slugs: ["church", "cemetery", "prison", "castle", "fire", "tornado", "earthquake", "storm", "money", "lottery", "teeth", "celebrity", "kissing", "demon", "colors", "heaven"],
  },
];

/** Last tier of chapter 1; tiers above it belong to the hidden chapter 2. */
export const CHAPTER1_LAST_TIER = 6;

export const CHAPTER1_SLUGS: string[] = CREATURE_TIERS.filter((t) => t.tier <= CHAPTER1_LAST_TIER).flatMap((t) => t.slugs);

/** True once every chapter-1 creature has been caught at least once. */
export function chapterOneDone(caught: Record<string, number> | undefined): boolean {
  return CHAPTER1_SLUGS.every((slug) => (caught?.[slug] ?? 0) > 0);
}

function tierVisible(tier: CreatureTier, chapter1Done: boolean): boolean {
  return tier.tier <= CHAPTER1_LAST_TIER || chapter1Done;
}

/** Creatures of the newest open tier come out this many times more often, so new kinds show up quickly. */
export const NEWEST_TIER_WEIGHT = 3;

/** Highest tier open for a player who has caught `lifetime` creatures in total. */
export function openTier(lifetime: number, chapter1Done = false): number {
  let t = 1;
  for (const tier of CREATURE_TIERS) if (tierVisible(tier, chapter1Done) && lifetime >= tier.unlockAt) t = tier.tier;
  return t;
}

/** The next tier to unlock, or null when everything visible is open (chapter 2 counts only once revealed). */
export function nextTier(lifetime: number, chapter1Done = false): CreatureTier | null {
  return CREATURE_TIERS.find((t) => tierVisible(t, chapter1Done) && lifetime < t.unlockAt) ?? null;
}
