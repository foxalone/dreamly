export const JA_PILOT_SLUGS = [
  "teeth-falling-out",
  "fire",
  "earthquake",
  "dead-person",
  "being-chased",
  "pregnancy",
  "snake",
  "tsunami",
  "being-late",
  "cheating",
] as const;

export type JaPilotSlug = (typeof JA_PILOT_SLUGS)[number];

const JA_ADDITIONAL_DREAM_SLUGS = [
  "cat",
  "water",
  "falling",
  "flying",
  "wedding",
  "ghost",
  "death",
  "baby",
  "car-accident",
  "hair-falling-out",
  "alligator",
  "crawling",
  "tunnel",
  "work",
  "heights",
  "nightmare",
  "mirror",
  "dog",
  "ocean",
  "spider",
  "rain",
  "flood",
  "river",
  "drowning",
  "clear-water",
  "stairs",
  "elevator",
  "school",
  "train",
  "house",
  "door",
  "forest",
  "horse",
  "lion",
  "bird",
  "butterfly",
  "moon",
  "wolf",
  "rabbit",
  "school-exam",
  "storm",
  "sun",
  "tree",
  "garden",
  "bear",
  "tiger",
  "elephant",
  "fox",
  "deer",
  "owl",
  "dolphin",
  "turtle",
  "frog",
  "white-snake",
  "shoes",
  "money",
  "phone",
  "crying",
  "swimming",
  "eating",
  "monkey",
  "whale",
  "shark",
  "black-cat",
  "white-cat",
  "dog-bite",
  "ring",
  "blood",
  "beach",
  "driving-car",
  "lost-baby",
  "funeral",
  "dead-relative",
  "cake",
  "train-station",
  "missing-a-train",
  "being-fired",
  "crocodile",
  "dirty-water",
  "black-snake",
] as const;

export type JaAdditionalDreamSlug = (typeof JA_ADDITIONAL_DREAM_SLUGS)[number];

export const JA_WEB_DREAM_SLUGS = [...JA_PILOT_SLUGS, ...JA_ADDITIONAL_DREAM_SLUGS] as const;
export type JaWebDreamSlug = (typeof JA_WEB_DREAM_SLUGS)[number];

const japanesePaths = new Map<string, string>([
  ["/", "/ja"],
  ["/dreams", "/ja/dreams"],
  ...JA_WEB_DREAM_SLUGS.map((slug): [string, string] => [`/dreams/${slug}`, `/ja/dreams/${slug}`]),
]);

const pilotPaths = new Set(japanesePaths.values());

export function jaPilotAlternate(path: string): string | undefined {
  return japanesePaths.get(path);
}

export function isJaPilotPath(path: string): boolean {
  return pilotPaths.has(path);
}

export function isJaDreamFormPath(path: string): boolean {
  return path.startsWith("/ja/dreams/") && isJaPilotPath(path);
}
