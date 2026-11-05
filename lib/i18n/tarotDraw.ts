import type { Locale } from "./config";

type TarotDrawCopy = { open: string; title: string; loading: string; error: string; retry: string; close: string; read: string };

export const tarotDrawCopy: Record<Locale, TarotDrawCopy> = {
  en: { open: "Reveal today's tarot card", title: "Your card today", loading: "Drawing your card…", error: "Your card could not be shown right now.", retry: "Try again", close: "Close", read: "Read about this card" },
  es: { open: "Revelar tu carta del tarot de hoy", title: "Tu carta de hoy", loading: "Eligiendo tu carta…", error: "No se pudo mostrar tu carta ahora.", retry: "Intentar de nuevo", close: "Cerrar", read: "Leer sobre esta carta" },
  ar: { open: "اكشف بطاقة التاروت الخاصة بك اليوم", title: "بطاقتك اليوم", loading: "جارٍ اختيار بطاقتك…", error: "تعذّر عرض بطاقتك الآن.", retry: "حاول مجددًا", close: "إغلاق", read: "اقرأ عن هذه البطاقة" },
  pt: { open: "Revelar sua carta de tarô de hoje", title: "Sua carta de hoje", loading: "Escolhendo sua carta…", error: "Não foi possível mostrar sua carta agora.", retry: "Tentar novamente", close: "Fechar", read: "Ler sobre esta carta" },
  de: { open: "Deine heutige Tarotkarte aufdecken", title: "Deine Karte heute", loading: "Deine Karte wird gezogen…", error: "Deine Karte kann gerade nicht angezeigt werden.", retry: "Erneut versuchen", close: "Schließen", read: "Mehr über diese Karte lesen" },
  ru: { open: "Открыть сегодняшнюю карту Таро", title: "Ваша карта сегодня", loading: "Выбираем вашу карту…", error: "Сейчас не удалось показать вашу карту.", retry: "Попробовать снова", close: "Закрыть", read: "Прочитать о карте" },
};
