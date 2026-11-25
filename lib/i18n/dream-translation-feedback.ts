import type { Locale } from "./config";

export const dreamTranslationFeedbackCopy: Record<Locale | "ja", { title: string; tryAgain: string; close: string }> = {
  en: { title: "Couldn’t translate", tryAgain: "Please try again.", close: "Close" },
  es: { title: "No se pudo traducir", tryAgain: "Inténtalo de nuevo.", close: "Cerrar" },
  ar: { title: "تعذّرت الترجمة", tryAgain: "يرجى المحاولة مجددًا.", close: "إغلاق" },
  pt: { title: "Não foi possível traduzir", tryAgain: "Tente novamente.", close: "Fechar" },
  de: { title: "Übersetzung fehlgeschlagen", tryAgain: "Bitte versuche es erneut.", close: "Schließen" },
  ru: { title: "Не удалось перевести", tryAgain: "Попробуйте ещё раз.", close: "Закрыть" },
  ja: { title: "翻訳できませんでした", tryAgain: "もう一度お試しください。", close: "閉じる" },
};
