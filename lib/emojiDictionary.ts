import emojiData from "@emoji-mart/data";
import { ALL_DREAM_ENTRIES, getDreamEntry, PARENT_DREAMS } from "./dream-dictionary";
import { isGarbageEmojiId, normalizeEmojiKey, type EmojiDataLike } from "./dreamEmojiResolve";
import { normalizeMatchText, prepareSearchCandidate, scorePreparedSearchCandidate } from "./searchMatching";

const searchIndex = ALL_DREAM_ENTRIES.map((entry) => ({ slug: entry.slug, prepared: prepareSearchCandidate(entry) }));

export const EMOJI_DICTIONARY_LINKS_COLLECTION = "emojiDictionaryLinks";
export type EmojiDictionaryResult = { slug: string | null; query: string };

const data = (emojiData as EmojiDataLike).emojis;
export const DICTIONARY_EMOJIS = Object.entries(data).flatMap(([id, row]) => {
  const emoji = row.skins?.[0]?.native;
  if (!emoji || isGarbageEmojiId(id, row.name || "")) return [];
  return [{ id, emoji, name: row.name || id, key: normalizeEmojiKey(emoji) }];
});
const byNative = new Map(Object.values(data).flatMap((row) => {
  const emoji = row.skins?.[0]?.native;
  return emoji ? [[normalizeEmojiKey(emoji), row] as const] : [];
}));
const byIcon = new Map<string, string>();
for (const entry of PARENT_DREAMS) {
  if (entry.comboOf) continue;
  const key = normalizeEmojiKey(entry.icon);
  if (key && !byIcon.has(key)) byIcon.set(key, entry.slug);
}
const cache = new Map<string, EmojiDictionaryResult>();

/** Used by both the map and the admin backlog: one definition of a missing article. */
export function resolveEmojiDictionary(raw: string, linkedSlug?: string | null): EmojiDictionaryResult {
  const key = normalizeEmojiKey(raw);
  const meta = byNative.get(key);
  const query = (meta?.name || "").toLowerCase();
  if (linkedSlug && getDreamEntry(linkedSlug)) return { slug: linkedSlug, query };
  const cached = cache.get(key);
  if (cached) return cached;
  let slug = byIcon.get(key) || null;
  if (!slug && meta) {
    let best: { slug: string; score: number } | null = null;
    for (const text of [query, ...(meta.keywords || []).slice(0, 3)]) {
      const query = normalizeMatchText(text);
      if (!query) continue;
      for (const entry of searchIndex) {
        const score = scorePreparedSearchCandidate(query, entry.prepared);
        if (score >= 2 && (!best || score > best.score)) best = { slug: entry.slug, score };
      }
    }
    slug = best?.slug || null;
  }
  const result = { slug, query };
  cache.set(key, result);
  return result;
}

/** Actual dream markers only, with the same nested/flat counters and coordinates as the map. */
export function dreamMapDictionaryRows(
  cities: Record<string, unknown>[],
  links: ReadonlyMap<string, string> = new Map(),
) {
  const byKey = new Map(DICTIONARY_EMOJIS.map((item) => [item.key, item]));
  const totals = new Map<string, { emoji: string; count: number }>();
  const coordinate = (value: unknown) => value != null && String(value).trim() !== ""
    && Number.isFinite(Number(String(value).trim().replace(",", ".")));
  for (const city of cities) {
    if (!coordinate(city.lat) || !coordinate(city.lng)) continue;
    const counters: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(city)) {
      if (field.startsWith("emojis.")) counters[field.slice("emojis.".length)] = value;
    }
    const add = (emoji: string, value: unknown) => {
      const count = Number(value);
      const key = normalizeEmojiKey(emoji);
      if (!key || !Number.isFinite(count) || count <= 0) return;
      const previous = totals.get(key);
      totals.set(key, { emoji: previous?.emoji || emoji, count: (previous?.count || 0) + count });
    };
    for (const [emoji, value] of Object.entries(counters)) add(emoji, value);
    if (city.emojis && typeof city.emojis === "object" && !Array.isArray(city.emojis)) {
      for (const [emoji, value] of Object.entries(city.emojis)) add(emoji, value);
    }
  }
  return [...totals.entries()].map(([key, { emoji, count }]) => {
    const result = resolveEmojiDictionary(emoji, links.get(key));
    const item = byKey.get(key) || { key, emoji, id: key, name: result.query || emoji };
    return { ...item, count, slug: result.slug, manual: Boolean(links.get(key) && links.get(key) === result.slug) };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
