import { normalizeTranslationLanguage } from "./translationLanguage";

export const TRANSLATION_AD_GRANT_MS = 10 * 60_000;

export type TranslationAdTarget = { sharedDreamId: string; targetLang: string };

export function translationAdTarget(sharedDreamId: unknown, targetLang: unknown): TranslationAdTarget | null {
  const id = typeof sharedDreamId === "string" ? sharedDreamId.trim() : "";
  const lang = normalizeTranslationLanguage(targetLang);
  return id && !id.includes("/") && lang ? { sharedDreamId: id, targetLang: lang } : null;
}

export function matchingTranslationAdGrant(raw: unknown, target: TranslationAdTarget, now = Date.now()): boolean {
  if (!raw || typeof raw !== "object") return false;
  const grant = raw as Record<string, unknown>;
  return grant.sharedDreamId === target.sharedDreamId
    && grant.targetLang === target.targetLang
    && typeof grant.expiresAtMs === "number"
    && grant.expiresAtMs > now;
}
