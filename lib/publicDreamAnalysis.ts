/** Public copy of a dream reading. The feed shows two lines; the dream page shows the rest. */
export const PUBLIC_ANALYSIS_MAX = 12_000;

export function cleanAnalysis(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";
  return text.length > PUBLIC_ANALYSIS_MAX ? text.slice(0, PUBLIC_ANALYSIS_MAX) : text;
}
