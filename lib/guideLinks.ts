import { DREAM_SLUGS } from "@/lib/dream-dictionary";
import { DREAM_GUIDE_SLUGS } from "@/lib/dream-guides";

/**
 * Guide prose may carry internal links written as `[label](/dreams/slug)`.
 * Only root-relative paths are recognised; everything else stays plain text,
 * so older guides without the markup render exactly as before.
 */
export type GuideTextSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const LINK_PATTERN = /\[([^\]\n]+)\]\((\/[^)\s]*)\)/g;

export function parseGuideText(value: string): GuideTextSegment[] {
  const segments: GuideTextSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ kind: "text", text: value.slice(cursor, start) });
    segments.push({ kind: "link", text: match[1], href: match[2] });
    cursor = start + match[0].length;
  }
  if (cursor < value.length) segments.push({ kind: "text", text: value.slice(cursor) });
  return segments;
}

/** Guide prose with link markup reduced to its visible label (for JSON-LD and meta). */
export function guideTextPlain(value: string): string {
  return value.replace(LINK_PATTERN, "$1");
}

export function guideTextLinks(value: string): string[] {
  return parseGuideText(value)
    .filter((segment): segment is Extract<GuideTextSegment, { kind: "link" }> => segment.kind === "link")
    .map((segment) => segment.href);
}

const DREAMS_HUB_PATHS = ["a-z", "most-common", "nightmares", "biblical", "islamic", "spiritual"];

/** Internal targets a guide paragraph may link to; anything else renders as plain text. */
const KNOWN_GUIDE_HREFS = new Set<string>([
  "/dreams",
  ...DREAMS_HUB_PATHS.map((path) => `/dreams/${path}`),
  ...DREAM_SLUGS.map((slug) => `/dreams/${slug}`),
  ...DREAM_GUIDE_SLUGS.map((slug) => `/dreams/${slug}`),
]);

export function isKnownGuideHref(href: string): boolean {
  return KNOWN_GUIDE_HREFS.has(href);
}
