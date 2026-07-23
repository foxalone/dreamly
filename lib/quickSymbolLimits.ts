/** Client-safe Quick Symbol limits/helpers. Keep this module free of dictionary content. */
export const QUICK_SYMBOL_MAX_WORDS = 10;

export function countWords(text: string) {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
