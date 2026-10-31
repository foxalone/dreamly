/**
 * How long a dream or diary note may be. The limit people see is in WORDS;
 * the character cap is only a safety net (Firestore doc size, model input).
 */
export type TextLimits = { maxWords: number; maxChars: number };

export const DREAM_MAX_WORDS = 350;
export const DREAM_MAX_CHARS = 3500;
export const JOURNAL_MAX_WORDS = 500;
export const JOURNAL_MAX_CHARS = 5000;

export const DREAM_LIMITS: TextLimits = { maxWords: DREAM_MAX_WORDS, maxChars: DREAM_MAX_CHARS };
export const JOURNAL_LIMITS: TextLimits = { maxWords: JOURNAL_MAX_WORDS, maxChars: JOURNAL_MAX_CHARS };

export function countDreamWords(text: unknown): number {
  const s = String(text ?? "").trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

export function isTextTooLong(text: unknown, limits: TextLimits = DREAM_LIMITS): boolean {
  const s = String(text ?? "").trim();
  return s.length > limits.maxChars || countDreamWords(s) > limits.maxWords;
}

export function isDreamTooLong(text: unknown): boolean {
  return isTextTooLong(text, DREAM_LIMITS);
}

/**
 * Cut text typed into a box down to the limits, keeping the writer's own
 * spacing and newlines. Text within the limits comes back unchanged (even
 * trailing spaces, so typing the next word still works).
 */
export function clampText(text: unknown, limits: TextLimits = DREAM_LIMITS): string {
  let s = String(text ?? "");
  if (s.length > limits.maxChars) s = s.slice(0, limits.maxChars);
  if (countDreamWords(s) <= limits.maxWords) return s;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(s))) {
    n += 1;
    if (n === limits.maxWords) return s.slice(0, m.index + m[0].length);
  }
  return s;
}

export function clampDreamText(text: unknown): string {
  return clampText(text, DREAM_LIMITS);
}
