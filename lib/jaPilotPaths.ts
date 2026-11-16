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

const japanesePaths = new Map<string, string>([
  ["/", "/ja"],
  ["/dreams", "/ja/dreams"],
  ...JA_PILOT_SLUGS.map((slug): [string, string] => [`/dreams/${slug}`, `/ja/dreams/${slug}`]),
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
