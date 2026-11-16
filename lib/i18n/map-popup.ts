import type { Locale } from "./config";

type Copy = { analyzeDream: string };

export const mapPopupMessages: Record<Locale, Copy> = {
  ja: { analyzeDream: "自分の夢も読み解いてみる" },
  en: { analyzeDream: "Analyze your own dream!" },
  es: { analyzeDream: "¡Analiza tu propio sueño!" },
  ar: { analyzeDream: "حلّل حلمك!" },
  pt: { analyzeDream: "Analise seu próprio sonho!" },
  de: { analyzeDream: "Lass deinen eigenen Traum deuten!" },
  ru: { analyzeDream: "Проанализируйте свой сон!" },
};
