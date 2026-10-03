/**
 * Dream Kingdoms — which creatures can come out of the dream catcher, and when.
 * Every creature is a top-level dream-dictionary symbol (slug), so its card links to /dreams/<slug>.
 * A tier opens once the player has caught `unlockAt` creatures in total (lifetime, all kinds).
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
    unlockAt: 1_000,
    slugs: ["elephant", "dolphin", "bat", "lizard", "octopus", "eagle", "whale", "spider", "snake", "wolf", "bear"],
  },
  { tier: 4, unlockAt: 5_000, slugs: ["lion", "tiger", "shark", "alligator", "scorpion", "dinosaur"] },
  { tier: 5, unlockAt: 20_000, slugs: ["ghost", "angel", "unicorn", "fairy", "mermaid"] },
  { tier: 6, unlockAt: 75_000, slugs: ["dragon", "phoenix", "genie", "wizard"] },
];

/** Creatures of the newest open tier come out this many times more often, so new kinds show up quickly. */
export const NEWEST_TIER_WEIGHT = 3;

/** Highest tier open for a player who has caught `lifetime` creatures in total. */
export function openTier(lifetime: number): number {
  let t = 1;
  for (const tier of CREATURE_TIERS) if (lifetime >= tier.unlockAt) t = tier.tier;
  return t;
}

/** The next tier to unlock, or null when everything is open. */
export function nextTier(lifetime: number): CreatureTier | null {
  return CREATURE_TIERS.find((t) => lifetime < t.unlockAt) ?? null;
}
