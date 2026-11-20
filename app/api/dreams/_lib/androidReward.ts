import { createHash } from "node:crypto";
import { isDreamTooLong } from "@/lib/dreamLength";
import { parseDreamLens } from "@/lib/dream-lenses";
import { readingDreamId } from "@/lib/readingAdGrant";
import { normalizeTranslationLanguage } from "@/lib/translationLanguage";

export const ANDROID_AD_REDEMPTION_MS = 30 * 60_000;

// Created in the redemption handler after validating the signed AdMob session.
export class AndroidRewardRequest extends Request {}

export function androidRewardTarget(body: Record<string, unknown>) {
  switch (body.rewardAction) {
    case "analysis": {
      const id = readingDreamId(body.dreamId);
      const text = typeof body.text === "string" ? body.text.trim() : "";
      const language = typeof body.lang === "string" ? body.lang.trim() : "";
      if (!id || !text || isDreamTooLong(text) || language.length > 16) return null;
      const lens = parseDreamLens(body.lens);
      const fingerprint = createHash("sha256").update(JSON.stringify([id, text, language, lens])).digest("hex");
      return { action: "analysis", key: fingerprint, payload: { dreamId: id, text, lang: language, lens, source: "android" } } as const;
    }
    case "reading": {
      const id = readingDreamId(body.sharedDreamId);
      return id ? { action: "reading", key: id, payload: { sharedDreamId: id } } as const : null;
    }
    case "translation": {
      const id = readingDreamId(body.sharedDreamId);
      const language = normalizeTranslationLanguage(body.targetLang);
      return id && language ? {
        action: "translation", key: `${id}:${language}`, payload: { sharedDreamId: id, targetLang: language },
      } as const : null;
    }
    default:
      return null;
  }
}
