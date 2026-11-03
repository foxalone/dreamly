/** Public copy of a dream reading. The feed shows two lines; the dream page shows the rest. */
export const PUBLIC_ANALYSIS_MAX = 12_000;

// Older AI readings sometimes began with a language note instead of the interpretation.
const LANGUAGE_NOTE = /^Language identified:\s*(?:Brazilian Portuguese|Portuguese|English|Spanish|Arabic|German|Russian|Hebrew)\b\s*(?:[.:-]\s*)?/i;

export function cleanAnalysis(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim().replace(LANGUAGE_NOTE, "").trim();
  if (!text) return "";
  return text.length > PUBLIC_ANALYSIS_MAX ? text.slice(0, PUBLIC_ANALYSIS_MAX) : text;
}
