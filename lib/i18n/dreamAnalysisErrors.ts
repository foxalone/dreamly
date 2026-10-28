import type { Locale } from "./config";

type Code = "AI_QUOTA_EXHAUSTED" | "AI_RATE_LIMITED" | "AI_TIMEOUT" | "AI_UNAVAILABLE";

const COPY: Record<Locale, Record<Code, string>> = {
  en: {
    AI_QUOTA_EXHAUSTED: "Dream interpretation is unavailable right now. Please try again later.",
    AI_RATE_LIMITED: "Dream interpretation is busy right now. Please try again shortly.",
    AI_TIMEOUT: "Dream interpretation took too long. Please try again.",
    AI_UNAVAILABLE: "Dream interpretation is unavailable right now. Please try again later.",
  },
  es: {
    AI_QUOTA_EXHAUSTED: "La interpretación de sueños no está disponible ahora. Inténtalo más tarde.",
    AI_RATE_LIMITED: "La interpretación de sueños está ocupada ahora. Inténtalo de nuevo en breve.",
    AI_TIMEOUT: "La interpretación tardó demasiado. Inténtalo de nuevo.",
    AI_UNAVAILABLE: "La interpretación de sueños no está disponible ahora. Inténtalo más tarde.",
  },
  ar: {
    AI_QUOTA_EXHAUSTED: "تفسير الأحلام غير متاح الآن. حاول مجددًا لاحقًا.",
    AI_RATE_LIMITED: "خدمة تفسير الأحلام مشغولة الآن. حاول مجددًا بعد قليل.",
    AI_TIMEOUT: "استغرق تفسير الحلم وقتًا طويلًا. حاول مجددًا.",
    AI_UNAVAILABLE: "تفسير الأحلام غير متاح الآن. حاول مجددًا لاحقًا.",
  },
  pt: {
    AI_QUOTA_EXHAUSTED: "A interpretação de sonhos está indisponível agora. Tente mais tarde.",
    AI_RATE_LIMITED: "A interpretação de sonhos está ocupada agora. Tente novamente em instantes.",
    AI_TIMEOUT: "A interpretação do sonho demorou demais. Tente novamente.",
    AI_UNAVAILABLE: "A interpretação de sonhos está indisponível agora. Tente mais tarde.",
  },
  de: {
    AI_QUOTA_EXHAUSTED: "Die Traumdeutung ist derzeit nicht verfügbar. Versuch es später erneut.",
    AI_RATE_LIMITED: "Die Traumdeutung ist derzeit ausgelastet. Versuch es gleich noch einmal.",
    AI_TIMEOUT: "Die Traumdeutung hat zu lange gedauert. Versuch es erneut.",
    AI_UNAVAILABLE: "Die Traumdeutung ist derzeit nicht verfügbar. Versuch es später erneut.",
  },
  ru: {
    AI_QUOTA_EXHAUSTED: "Толкование снов сейчас недоступно. Попробуйте позже.",
    AI_RATE_LIMITED: "Сервис толкования снов сейчас перегружен. Повторите попытку чуть позже.",
    AI_TIMEOUT: "Толкование заняло слишком много времени. Повторите попытку.",
    AI_UNAVAILABLE: "Толкование снов сейчас недоступно. Попробуйте позже.",
  },
};

export function dreamAnalysisErrorMessage(code: unknown, locale: Locale): string | null {
  return typeof code === "string" && Object.hasOwn(COPY[locale], code) ? COPY[locale][code as Code] : null;
}
