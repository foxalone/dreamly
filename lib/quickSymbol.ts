import { ALL_DREAM_ENTRIES, type DreamEntry } from "@/lib/dream-dictionary";
import { countWords, QUICK_SYMBOL_MAX_WORDS } from "@/lib/quickSymbolLimits";

export { countWords, QUICK_SYMBOL_MAX_WORDS };

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

/** Server-only: walks the full dictionary. Do not import this module from client components. */
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
