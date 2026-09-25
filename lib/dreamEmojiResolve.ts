/**
 * Pure helpers that turn model-emitted emoji strings into entries the map and
 * the admin understand (`{ native, id, name }` from @emoji-mart/data).
 *
 * The AI is allowed to answer with any emoji; this module is the gate that
 * keeps only real, single, non-flag emojis so `city_emoji_stats` and the
 * admin emoji search keep working on canonical natives.
 */

export type DreamEmojiEntry = { native: string; id: string; name: string };

/** An AI pick with fewer than this many valid emojis is ignored in favour of the keyword fallback. */
export const DREAM_EMOJI_MIN = 2;
export const DREAM_EMOJI_MAX = 4;

/** True when a server emoji pick is good enough to replace the keyword fallback. */
export function hasEnoughDreamEmojis(list: unknown): list is DreamEmojiEntry[] {
  if (!Array.isArray(list)) return false;
  const valid = list.filter((e) => e && typeof e === "object" && String((e as any).native ?? "").trim());
  return valid.length >= DREAM_EMOJI_MIN;
}

/** Minimal shape of @emoji-mart/data we depend on. */
export type EmojiDataLike = {
  emojis: Record<
    string,
    {
      id?: string;
      name?: string;
      keywords?: string[];
      skins?: Array<{ native?: string }>;
    }
  >;
};

export type EmojiResolver = {
  /** Canonical entry for a raw emoji string, or null when it is not a usable emoji. */
  resolve: (raw: string) => DreamEmojiEntry | null;
  /** Split free text into emoji graphemes, resolve each, dedupe, cap. */
  resolveMany: (raws: unknown, max?: number) => DreamEmojiEntry[];
};

// U+FE0F variation selector, U+1F3FB–U+1F3FF skin tones.
const VS_OR_TONE = /️|[\u{1F3FB}-\u{1F3FF}]/gu;

export function normalizeEmojiKey(v: string): string {
  return String(v ?? "").replace(VS_OR_TONE, "").trim();
}

export function isGarbageEmojiId(id: string, name: string): boolean {
  const i = id.toLowerCase();
  const n = name.toLowerCase();
  if (i.startsWith("flag-") || n.includes("flag")) return true;
  if (i.includes("skin-tone")) return true;
  if (i.startsWith("keycap_") || n.includes("keycap")) return true;
  if (n.includes("regional indicator")) return true;
  return false;
}

/** Extract emoji-looking graphemes from a string (keeps ZWJ sequences together). */
export function extractEmojiGraphemes(text: string): string[] {
  const s = String(text ?? "");
  if (!s) return [];
  const out: string[] = [];
  const seg = typeof Intl !== "undefined" && (Intl as any).Segmenter
    ? new (Intl as any).Segmenter(undefined, { granularity: "grapheme" })
    : null;
  const parts: string[] = seg
    ? Array.from(seg.segment(s), (x: any) => String(x.segment))
    : Array.from(s);
  for (const p of parts) {
    if (/\p{Extended_Pictographic}/u.test(p)) out.push(p);
  }
  return out;
}

export function createEmojiResolver(data: EmojiDataLike): EmojiResolver {
  const byKey = new Map<string, DreamEmojiEntry>();
  for (const [key, row] of Object.entries(data?.emojis ?? {})) {
    const id = String(row?.id ?? key ?? "").trim();
    const name = String(row?.name ?? "").trim();
    const skins = Array.isArray(row?.skins) ? row.skins : [];
    const base = String(skins[0]?.native ?? "").trim();
    if (!id || !base) continue;
    if (isGarbageEmojiId(id, name)) continue;
    const entry: DreamEmojiEntry = { native: base, id, name: name || id };
    for (const skin of skins) {
      const k = normalizeEmojiKey(String(skin?.native ?? ""));
      if (k && !byKey.has(k)) byKey.set(k, entry);
    }
  }

  const resolve = (raw: string): DreamEmojiEntry | null => {
    const k = normalizeEmojiKey(raw);
    if (!k) return null;
    return byKey.get(k) ?? null;
  };

  const resolveMany = (raws: unknown, max = 4): DreamEmojiEntry[] => {
    const list: string[] = Array.isArray(raws) ? raws.map((x) => String(x ?? "")) : [String(raws ?? "")];
    const out: DreamEmojiEntry[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      for (const g of extractEmojiGraphemes(item)) {
        const hit = resolve(g);
        if (!hit || seen.has(hit.native)) continue;
        seen.add(hit.native);
        out.push(hit);
        if (out.length >= max) return out;
      }
    }
    return out;
  };

  return { resolve, resolveMany };
}
