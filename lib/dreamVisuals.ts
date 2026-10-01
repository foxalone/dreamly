/**
 * Pure helpers that size and normalise a dream's visuals (roots, emojis,
 * Lucide icons). Shared by the journal page and the server-side enrichment
 * that runs right after a diary save (lib/dreams/enrichSavedDream.ts), so a
 * dream gets the same number of roots/emojis/icons wherever it is processed.
 */

export function countWords(text: string) {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function desiredCountsFromText(text: string) {
  const wc = countWords(text);
  const cc = (text ?? "").trim().length;

  if (!wc && !cc) return { roots: 2, emojis: 1, icons: 1 };

  const roots = Math.min(8, Math.max(2, Math.ceil(wc / 22)));
  const emojis = Math.min(6, Math.max(1, Math.ceil(wc / 24)));
  const icons = Math.min(5, Math.max(1, Math.ceil(wc / 30)));

  return { roots, emojis, icons };
}

const IRREGULAR_SINGULAR: Record<string, string> = {
  mice: "mouse",
  geese: "goose",
  teeth: "tooth",
  feet: "foot",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
};

export function singularizeEnWord(w: string) {
  const s = (w ?? "").toLowerCase();
  if (!s) return s;

  if (IRREGULAR_SINGULAR[s]) return IRREGULAR_SINGULAR[s];
  if (s.length <= 3) return s;

  if (
    s.endsWith("ches") ||
    s.endsWith("shes") ||
    s.endsWith("xes") ||
    s.endsWith("ses") ||
    s.endsWith("zes")
  )
    return s.slice(0, -2);

  if (s.endsWith("ies") && s.length > 4) return s.slice(0, -3) + "y";
  if (s.endsWith("ves") && s.length > 4) return s.slice(0, -3) + "f";
  if (s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);

  return s;
}

export function normalizeForIconsEn(input: string) {
  return (input ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeEnWord)
    .join(" ");
}

/** Keep only icon keys that have a glyph in the icon table, capped at `max`. */
export function filterIconsWithGlyph<K extends string>(
  keys: K[],
  table: Record<string, { emoji?: string; native?: string } | undefined>,
  max: number
): K[] {
  const out: K[] = [];
  for (const k of keys) {
    const icon = table?.[k];
    const glyph = icon?.emoji ?? icon?.native;
    if (!glyph) continue;
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

type EmojiRow = { id?: string; name?: string; keywords?: string[]; skins?: Array<{ native?: string }> };
export type KeywordEmoji = { native: string; id: string; name: string };

function isGarbage(id: string, name: string) {
  const i = id.toLowerCase();
  const n = name.toLowerCase();
  return (
    i.startsWith("flag-") ||
    n.includes("flag") ||
    i.includes("skin-tone") ||
    i.startsWith("keycap_") ||
    n.includes("keycap") ||
    n.includes("regional indicator")
  );
}

/**
 * Fallback when the AI emoji pick fails: map English root words to emojis by
 * emoji-mart name / keyword. Exact name beats exact keyword beats a name that
 * contains the word. One emoji per root, no repeats.
 */
export function pickEmojisByKeywords(
  rootsEn: string[],
  data: { emojis: Record<string, EmojiRow> },
  max: number
): KeywordEmoji[] {
  const rows: KeywordEmoji[] = [];
  const meta: Array<{ name: string; keywords: string[] }> = [];
  for (const [key, row] of Object.entries(data?.emojis ?? {})) {
    const id = String(row?.id ?? key ?? "").trim();
    const name = String(row?.name ?? "").trim();
    const native = String(row?.skins?.[0]?.native ?? "").trim();
    if (!id || !native || isGarbage(id, name)) continue;
    rows.push({ native, id, name: name || id });
    meta.push({
      name: name.toLowerCase(),
      keywords: Array.isArray(row?.keywords) ? row.keywords.map((k) => String(k).toLowerCase()) : [],
    });
  }

  const out: KeywordEmoji[] = [];
  const seen = new Set<string>();
  for (const rawRoot of rootsEn) {
    if (out.length >= max) break;
    const word = singularizeEnWord(String(rawRoot ?? "").trim().toLowerCase().split(/\s+/).pop() ?? "");
    if (!word || word.length < 3) continue;

    let best = -1;
    let bestScore = 0;
    for (let i = 0; i < rows.length; i++) {
      if (seen.has(rows[i].native)) continue;
      const m = meta[i];
      let score = 0;
      if (m.name === word) score = 3;
      else if (m.keywords.includes(word)) score = 2;
      else if (new RegExp(`(^|\\s)${word}($|\\s)`).test(m.name)) score = 1;
      if (score > bestScore) {
        bestScore = score;
        best = i;
        if (score === 3) break;
      }
    }
    if (best >= 0) {
      seen.add(rows[best].native);
      out.push(rows[best]);
    }
  }
  return out;
}
