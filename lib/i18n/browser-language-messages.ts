import type { Locale } from "./config";

/** Written in the suggested language so visitors can recognize their language. */
export const browserLanguageMessages: Record<Locale, { title: string; action: string; dismiss: string }> = {
  en: { title: "Dreamly is available in English", action: "Switch to English", dismiss: "Dismiss language suggestion" },
  es: { title: "Dreamly está disponible en español", action: "Cambiar a español", dismiss: "Cerrar sugerencia de idioma" },
  ar: { title: "يمكنك استخدام Dreamly بالعربية", action: "الانتقال إلى العربية", dismiss: "إغلاق اقتراح اللغة" },
  pt: { title: "O Dreamly está disponível em português", action: "Mudar para português", dismiss: "Fechar sugestão de idioma" },
  de: { title: "Dreamly gibt es auch auf Deutsch", action: "Zu Deutsch wechseln", dismiss: "Sprachvorschlag schließen" },
  ru: { title: "Dreamly доступен на русском", action: "Перейти на русский", dismiss: "Закрыть предложение языка" },
};
