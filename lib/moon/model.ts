import type { ShareBadgeId } from "@/lib/shareBadges";
export const MOON_THRESHOLD = 5;
export type LunarPoint = { lng: number; lat: number };
export type MoonPin = LunarPoint & { id: string; character: ShareBadgeId; dreams: number; mine: boolean; joinedAtMs: number; topEmojis: string[]; latest: { id: string; snippet: string } | null };
export type MoonAccess = { eligible: boolean; count: number; joined: boolean; analyzedCount?: number; point?: LunarPoint; pins?: MoonPin[] };

/** Count distinct, currently published dreams, excluding deleted shells and stories. */
export function publishedDreamCount(rows: { id: string; data: Record<string, unknown> }[]) {
  return new Set(rows.filter(({ data }) => data.deleted !== true && data.sourceType !== "story" && !data.ownerStoryId && String(data.text ?? "").trim())
    .map(({ id, data }) => String(data.ownerDreamId || id))).size;
}

/** Count diary entries with a saved analysis, including dreams saved before sourceType was recorded. */
export function analyzedDreamCount(dreams: { analysisText?: unknown; sourceType?: unknown; deleted?: unknown }[]) {
  return dreams.filter(({ analysisText, sourceType, deleted }) =>
    deleted !== true && sourceType !== "journal" && sourceType !== "story"
    && typeof analysisText === "string" && analysisText.trim() !== "").length;
}

/** Uniform points on a sphere, away from the raster's missing polar caps. */
export function lunarPoint(longitude: number, latitude: number): LunarPoint {
  return { lng: longitude * 360 - 180, lat: Math.asin((latitude * 2 - 1) * Math.sin(75 * Math.PI / 180)) * 180 / Math.PI };
}

