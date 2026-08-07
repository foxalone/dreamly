import { ALL_DREAM_ENTRIES, type DreamEntry } from "@/lib/dream-dictionary";
import { countWords, QUICK_SYMBOL_MAX_WORDS } from "@/lib/quickSymbolLimits";
import {
  normalizeMatchText,
  scoreSearchCandidate,
} from "@/lib/searchMatching";

export { countWords, QUICK_SYMBOL_MAX_WORDS };

export type QuickSymbolMatch = {
  slug: string;
  title: string;
  icon: string;
  shortMeaning: string;
  snippet: string;
  score: number;
};

export function normalizeQuickQuery(text: string) {
  return normalizeMatchText(text);
}

/** Score >= 2 = strong match (exact/prefix/alias) — free path. */
export function scoreDreamEntry(query: string, entry: DreamEntry): number {
  return scoreSearchCandidate(query, entry);
}

/** Server-only: walks the full dictionary. Do not import this module from client components. */
export function findBestDreamMatch(query: string): QuickSymbolMatch | null {
  const q = normalizeMatchText(query);
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
