import type { Locale } from "./config";

type Copy = {
  loadMore: string;
  loading: string;
  error: string;
};

export const feedPaginationCopy: Record<Locale, Copy> = {
  en: { loadMore: "Load more dreams", loading: "Loading dreams…", error: "Could not load dreams. Please try again." },
  es: { loadMore: "Cargar más sueños", loading: "Cargando sueños…", error: "No se pudieron cargar los sueños. Inténtalo de nuevo." },
  ar: { loadMore: "تحميل المزيد من الأحلام", loading: "جارٍ تحميل الأحلام…", error: "تعذّر تحميل الأحلام. يُرجى المحاولة مجددًا." },
  pt: { loadMore: "Carregar mais sonhos", loading: "Carregando sonhos…", error: "Não foi possível carregar os sonhos. Tente novamente." },
  de: { loadMore: "Weitere Träume laden", loading: "Träume werden geladen…", error: "Die Träume konnten nicht geladen werden. Bitte versuche es erneut." },
  ru: { loadMore: "Загрузить ещё сны", loading: "Загрузка снов…", error: "Не удалось загрузить сны. Попробуйте ещё раз." },
};
