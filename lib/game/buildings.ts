/**
 * Dream Kingdoms — the 10 buildings (phase 1 ladder from Admin → Game).
 * cost = creatures to build it; perMin = creatures it brings per minute (also offline, up to the 8 h storage cap).
 * Buildings 1–3 are approved; 4–10 are the draft balance.
 */
export type Building = { id: string; emoji: string; name: string; cost: number; perMin: number };

export const BUILDINGS: Building[] = [
  { id: "hut", emoji: "🛖", name: "Hut", cost: 15, perMin: 1 },
  { id: "cottage", emoji: "🏠", name: "Cottage", cost: 200, perMin: 3 },
  { id: "dream-mill", emoji: "🌬️", name: "Dream Mill", cost: 1_000, perMin: 5 },
  { id: "tower", emoji: "🗼", name: "Tower", cost: 5_000, perMin: 10 },
  { id: "lighthouse", emoji: "🗽", name: "Lighthouse", cost: 20_000, perMin: 18 },
  { id: "castle", emoji: "🏰", name: "Castle", cost: 70_000, perMin: 30 },
  { id: "palace", emoji: "🏯", name: "Palace", cost: 200_000, perMin: 50 },
  { id: "cloud-citadel", emoji: "☁️", name: "Cloud Citadel", cost: 550_000, perMin: 80 },
  { id: "moon-city", emoji: "🌙", name: "Moon City", cost: 1_500_000, perMin: 130 },
  { id: "oneiros-palace", emoji: "✨", name: "Palace of Oneiros", cost: 4_000_000, perMin: 200 },
];

/** Compact number for small labels: 950, 5k, 1.5M. */
export function shortNumber(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}
