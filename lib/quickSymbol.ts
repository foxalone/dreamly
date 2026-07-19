import { ALL_DREAM_ENTRIES, type DreamEntry } from "@/lib/dream-dictionary";

export const QUICK_SYMBOL_MAX_WORDS = 10;

export type QuickSymbolMatch = {
  slug: string;
  title: string;
  icon: string;
  shortMeaning: string;
  snippet: string;
  score: number;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

export function countWords(text: string) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function normalizeQuickQuery(text: string) {
  return normalize(text);
}

/** Score >= 2 = strong match (exact/prefix/alias) — free path. */
export function scoreDreamEntry(query: string, entry: DreamEntry): number {
  const q = normalize(query);
  if (!q) return 0;

  const title = normalize(entry.title);
  const slug = normalize(entry.slug);
  const aliases = entry.aliases.map(normalize);

  if (title === q || slug === q || aliases.some((a) => a === q)) return 4;
  if (title.startsWith(q) || slug.startsWith(q)) return 3;
  if (aliases.some((a) => a.includes(q) || q.includes(a))) return 2;
  if (title.includes(q) || slug.includes(q)) return 1;
  return 0;
}

export function findBestDreamMatch(query: string): QuickSymbolMatch | null {
  const q = normalize(query);
  if (!q) return null;

  let best: { entry: DreamEntry; score: number } | null = null;

  for (const entry of ALL_DREAM_ENTRIES) {
    const score = scoreDreamEntry(q, entry);
    if (score < 2) continue;
    if (!best || score > best.score) {
      best = { entry, score };
    }
  }

  if (!best) return null;

  const intro = best.entry.sections?.introduction?.[0] ?? "";
  const snippet = (intro || best.entry.shortMeaning || "").trim().slice(0, 420);

  return {
    slug: best.entry.slug,
    title: best.entry.title,
    icon: best.entry.icon,
    shortMeaning: best.entry.shortMeaning,
    snippet,
    score: best.score,
  };
}
