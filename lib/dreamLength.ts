/**
 * How long a dream may be. The limit people see is in WORDS; the character
 * cap is only a safety net (Firestore doc size, OpenAI input) set well above
 * what 350 words take in any of our languages.
 */
export const DREAM_MAX_WORDS = 350;
export const DREAM_MAX_CHARS = 3500;

export function countDreamWords(text: unknown): number {
  const s = String(text ?? "").trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

export function isDreamTooLong(text: unknown): boolean {
  const s = String(text ?? "").trim();
  return s.length > DREAM_MAX_CHARS || countDreamWords(s) > DREAM_MAX_WORDS;
}

/**
 * Cut text typed into a dream box down to the limits, keeping the writer's own
 * spacing and newlines. Text within the limits comes back unchanged (even
 * trailing spaces, so typing the next word still works).
 */
export function clampDreamText(text: unknown): string {
  let s = String(text ?? "");
  if (s.length > DREAM_MAX_CHARS) s = s.slice(0, DREAM_MAX_CHARS);
  if (countDreamWords(s) <= DREAM_MAX_WORDS) return s;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(s))) {
    n += 1;
    if (n === DREAM_MAX_WORDS) return s.slice(0, m.index + m[0].length);
  }
  return s;
}
