/**
 * Dream Kingdoms — the 13 buildings (ladder from Admin → Game; temple, circus and gates added
 * 2026-10-03 before the last three, which moved up in price).
 * cost = creatures to build it; perMin = creatures it brings per minute (also offline, up to the 8 h storage cap).
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
  { id: "dream-temple", emoji: "🏛️", name: "Dream Temple", cost: 400_000, perMin: 65 },
  { id: "wonder-circus", emoji: "🎪", name: "Circus of Wonders", cost: 800_000, perMin: 85 },
  { id: "dream-gates", emoji: "⛩️", name: "Dream Gates", cost: 1_600_000, perMin: 110 },
  { id: "cloud-citadel", emoji: "☁️", name: "Cloud Citadel", cost: 3_200_000, perMin: 140 },
  { id: "moon-city", emoji: "🌙", name: "Moon City", cost: 6_500_000, perMin: 180 },
  { id: "oneiros-palace", emoji: "✨", name: "Palace of Oneiros", cost: 13_000_000, perMin: 250 },
];

/** Compact number for small labels: 950, 5k, 1.5M. */
export function shortNumber(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}
