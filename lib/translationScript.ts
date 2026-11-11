const TARGET_SCRIPT = {
  ru: "cyrillic",
  ar: "arabic",
  he: "hebrew",
  en: "latin",
  es: "latin",
  pt: "latin",
  de: "latin",
} as const;

type ScriptName = (typeof TARGET_SCRIPT)[keyof typeof TARGET_SCRIPT];

function countScript(text: string, script: ScriptName): number {
  const pattern = {
    cyrillic: /\p{Script=Cyrillic}/gu,
    arabic: /\p{Script=Arabic}/gu,
    hebrew: /\p{Script=Hebrew}/gu,
    latin: /\p{Script=Latin}/gu,
  }[script];
  return text.match(pattern)?.length ?? 0;
}

export function translationSourceLang(value: unknown): string | null {
  const base = String(value ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return base in TARGET_SCRIPT ? base : null;
}

function compact(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/** A saved translation has to be written in the requested language. */
export function translationMatchesTarget(
  text: string,
  targetLang: string,
  sourceText = "",
  sourceLang: string | null = null,
): boolean {
  const script = TARGET_SCRIPT[targetLang as keyof typeof TARGET_SCRIPT];
  if (!script) return false;
  const counts = {
    cyrillic: countScript(text, "cyrillic"),
    arabic: countScript(text, "arabic"),
    hebrew: countScript(text, "hebrew"),
    latin: countScript(text, "latin"),
  };
  const total = counts.cyrillic + counts.arabic + counts.hebrew + counts.latin;
  const target = counts[script];
  if (total === 0 || target <= total - target) return false;
  if (sourceLang && sourceLang !== targetLang && compact(text) === compact(sourceText)) return false;
  return true;
}
