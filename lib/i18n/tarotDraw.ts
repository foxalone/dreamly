import type { Locale } from "./config";

type TarotDrawCopy = { open: string; title: string; loading: string; error: string; retry: string; close: string; read: string; guideEyebrow: string; guideAction: string; guideDetail: string };

export const tarotDrawCopy: Record<Locale, TarotDrawCopy> = {
  en: { open: "Reveal today's tarot card", title: "Your card today", loading: "Drawing your card…", error: "Your card could not be shown right now.", retry: "Try again", close: "Close", read: "Read today’s card", guideEyebrow: "Or keep exploring", guideAction: "Explore Tarot", guideDetail: "Discover the 22 Major Arcana" },
  es: { open: "Revelar tu carta del tarot de hoy", title: "Tu carta de hoy", loading: "Eligiendo tu carta…", error: "No se pudo mostrar tu carta ahora.", retry: "Intentar de nuevo", close: "Cerrar", read: "Leer la carta de hoy", guideEyebrow: "O sigue explorando", guideAction: "Explora el tarot", guideDetail: "Descubre los 22 Arcanos Mayores" },
  ar: { open: "اكشف بطاقة التاروت الخاصة بك اليوم", title: "بطاقتك اليوم", loading: "جارٍ اختيار بطاقتك…", error: "تعذّر عرض بطاقتك الآن.", retry: "حاول مجددًا", close: "إغلاق", read: "اقرأ بطاقة اليوم", guideEyebrow: "أو واصل الاستكشاف", guideAction: "استكشف التاروت", guideDetail: "تعرّف على بطاقات الأركانا الكبرى الـ٢٢" },
  pt: { open: "Revelar sua carta de tarô de hoje", title: "Sua carta de hoje", loading: "Escolhendo sua carta…", error: "Não foi possível mostrar sua carta agora.", retry: "Tentar novamente", close: "Fechar", read: "Ler a carta de hoje", guideEyebrow: "Ou continue explorando", guideAction: "Explore o tarô", guideDetail: "Conheça os 22 Arcanos Maiores" },
  de: { open: "Deine heutige Tarotkarte aufdecken", title: "Deine Karte heute", loading: "Deine Karte wird gezogen…", error: "Deine Karte kann gerade nicht angezeigt werden.", retry: "Erneut versuchen", close: "Schließen", read: "Heutige Karte lesen", guideEyebrow: "Oder entdecke mehr", guideAction: "Tarot entdecken", guideDetail: "Lerne die 22 Großen Arkana kennen" },
  ru: { open: "Открыть сегодняшнюю карту Таро", title: "Ваша карта сегодня", loading: "Выбираем вашу карту…", error: "Сейчас не удалось показать вашу карту.", retry: "Попробовать снова", close: "Закрыть", read: "Читать карту дня", guideEyebrow: "Или узнайте больше", guideAction: "Исследовать Таро", guideDetail: "Познакомьтесь с 22 Старшими Арканами" },
};
