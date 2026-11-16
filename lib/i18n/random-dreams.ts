import type { Locale } from "./config";

type Copy = { title: string; read: string; loading: string; feed: string };
export const randomDreamMessages: Record<Locale, Copy> = {
  ja: { title: "世界の人が見た夢", read: "夢を読む", loading: "夢を読み込んでいます…", feed: "みんなの夢をもっと読む" },
  en: { title: "Dreams from around the world", read: "Read dream", loading: "Loading dreams…", feed: "Explore the dream feed" },
  es: { title: "Sueños de todo el mundo", read: "Leer sueño", loading: "Cargando sueños…", feed: "Explorar los sueños compartidos" },
  ar: { title: "أحلام من حول العالم", read: "اقرأ الحلم", loading: "جارٍ تحميل الأحلام…", feed: "استكشف الأحلام المنشورة" },
  pt: { title: "Sonhos pelo mundo", read: "Ler sonho", loading: "Carregando sonhos…", feed: "Explorar os sonhos compartilhados" },
  de: { title: "Träume aus aller Welt", read: "Traum lesen", loading: "Träume werden geladen…", feed: "Geteilte Träume entdecken" },
  ru: { title: "Сны со всего мира", read: "Прочитать сон", loading: "Загружаем сны…", feed: "Открыть ленту снов" },
};
