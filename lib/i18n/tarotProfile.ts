import type { Locale } from "./config";

type Copy = { title: string; intro: string; loading: string; error: string; retry: string; close: string };

export const tarotProfileCopy: Record<Locale, Copy> = {
  en: { title: "My tarot cards", intro: "The cards you discover turn face up here. Unrevealed cards remain face down.", loading: "Loading your cards…", error: "Your cards couldn't be loaded right now.", retry: "Try again", close: "Close card" },
  es: { title: "Mis cartas del tarot", intro: "Las cartas que descubres aparecen aquí boca arriba. Las demás permanecen boca abajo.", loading: "Cargando tus cartas…", error: "No se pudieron cargar tus cartas ahora.", retry: "Intentar de nuevo", close: "Cerrar carta" },
  ar: { title: "بطاقات التاروت الخاصة بي", intro: "تظهر هنا البطاقات التي تكشفها بوجهها الأمامي. وتبقى البطاقات الأخرى مقلوبة.", loading: "جارٍ تحميل بطاقاتك…", error: "تعذّر تحميل بطاقاتك الآن.", retry: "حاول مجددًا", close: "إغلاق البطاقة" },
  pt: { title: "Minhas cartas de tarô", intro: "As cartas que você revela aparecem aqui com a face para cima. As outras ficam viradas para baixo.", loading: "Carregando suas cartas…", error: "Não foi possível carregar suas cartas agora.", retry: "Tentar novamente", close: "Fechar carta" },
  de: { title: "Meine Tarotkarten", intro: "Aufgedeckte Karten zeigen hier ihre Vorderseite. Die übrigen bleiben verdeckt.", loading: "Deine Karten werden geladen…", error: "Deine Karten konnten gerade nicht geladen werden.", retry: "Erneut versuchen", close: "Karte schließen" },
  ru: { title: "Мои карты Таро", intro: "Открытые карты здесь поворачиваются лицевой стороной. Остальные остаются рубашкой вверх.", loading: "Загружаем ваши карты…", error: "Сейчас не удалось загрузить ваши карты.", retry: "Попробовать снова", close: "Закрыть карту" },
};
