export const TRANSLATION_LANGUAGES = {
  en: "English",
  es: "Español",
  ar: "العربية",
  pt: "Português (Brasil)",
  de: "Deutsch",
  ru: "Русский",
  he: "עברית",
} as const;

export type TranslationLanguage = keyof typeof TRANSLATION_LANGUAGES;

export const TRANSLATION_LANGUAGE_LABELS: Record<TranslationLanguage, string> = {
  en: "English", es: "Spanish", ar: "Arabic", pt: "Brazilian Portuguese",
  de: "German", ru: "Russian", he: "Hebrew",
};

export function normalizeTranslationLanguage(value: unknown): TranslationLanguage | null {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  if (base === "iw") return "he";
  return Object.hasOwn(TRANSLATION_LANGUAGES, base) ? base as TranslationLanguage : null;
}

export function resolveTranslationLanguage(preference: unknown, browserLanguages: readonly string[]): TranslationLanguage {
  return normalizeTranslationLanguage(preference)
    ?? browserLanguages.map(normalizeTranslationLanguage).find((lang) => lang !== null)
    ?? "en";
}
