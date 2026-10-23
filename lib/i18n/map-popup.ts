import type { Locale } from "./config";

type Copy = { analyzeDream: string };

export const mapPopupMessages: Record<Locale, Copy> = {
  en: { analyzeDream: "Analyze your own dream!" },
  es: { analyzeDream: "¡Analiza tu propio sueño!" },
  ar: { analyzeDream: "حلّل حلمك!" },
  pt: { analyzeDream: "Analise seu próprio sonho!" },
  de: { analyzeDream: "Lass deinen eigenen Traum deuten!" },
  ru: { analyzeDream: "Проанализируйте свой сон!" },
};
