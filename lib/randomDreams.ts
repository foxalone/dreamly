import { lunarPublicDreams, type PublicDreamRow } from "./moon/publicDreams";

export type RandomDreamCard = { id: string; snippet: string; emojis: string[] };

/** Draw without replacement, leaving the cached pool unchanged. */
export function pickRandomDreams<T>(items: readonly T[], count: number, random = Math.random): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, count));
}

/** Reuse the public-only filter; send snippets and icons, never author/account fields. */
export function publicDreamCards(rows: PublicDreamRow[]): RandomDreamCard[] {
  return lunarPublicDreams(rows).map(({ id, text, emojis }) => {
    const characters = Array.from(text);
    return { id, snippet: characters.slice(0, 180).join("") + (characters.length > 180 ? "…" : ""), emojis: emojis.slice(0, 3) };
  });
}
