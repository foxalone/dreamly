import type { Locale } from "./config";

type GalleryCopy = {
  dictionary: string; dreamers: string; empty: string; loading: string; more: string; retry: string;
  unavailable: string; like: string; unlike: string; publish: string; unpublish: string; publicationFailed: string;
};

export const dreamersGalleryCopy: Record<Locale, GalleryCopy> = {
  en: {
    dictionary: "Dictionary", dreamers: "Your Dreams", empty: "No dream illustrations have been shared yet.",
    loading: "Loading illustrations…", more: "Load more", retry: "Try again", unavailable: "The gallery is temporarily unavailable.",
    like: "Like illustration", unlike: "Unlike illustration", publish: "Publish to gallery", unpublish: "Remove from gallery",
    publicationFailed: "Couldn’t change gallery visibility. Please try again.",
  },
  es: {
    dictionary: "Diccionario", dreamers: "Tus sueños", empty: "Todavía no se han compartido ilustraciones de sueños.",
    loading: "Cargando ilustraciones…", more: "Cargar más", retry: "Volver a intentar", unavailable: "La galería no está disponible en este momento.",
    like: "Me gusta esta ilustración", unlike: "Quitar Me gusta", publish: "Publicar en la galería", unpublish: "Retirar de la galería",
    publicationFailed: "No se pudo cambiar la visibilidad en la galería. Inténtalo de nuevo.",
  },
  ar: {
    dictionary: "القاموس", dreamers: "أحلامك", empty: "لم تُنشر أي صور للأحلام بعد.",
    loading: "جارٍ تحميل الصور…", more: "عرض المزيد", retry: "إعادة المحاولة", unavailable: "المعرض غير متاح مؤقتًا.",
    like: "أعجبتني الصورة", unlike: "إلغاء الإعجاب", publish: "نشر في المعرض", unpublish: "إزالة من المعرض",
    publicationFailed: "تعذّر تغيير ظهور الصورة في المعرض. يُرجى المحاولة مجددًا.",
  },
  pt: {
    dictionary: "Dicionário", dreamers: "Seus sonhos", empty: "Nenhuma ilustração de sonho foi compartilhada ainda.",
    loading: "Carregando ilustrações…", more: "Carregar mais", retry: "Tentar novamente", unavailable: "A galeria está temporariamente indisponível.",
    like: "Curtir ilustração", unlike: "Descurtir ilustração", publish: "Publicar na galeria", unpublish: "Remover da galeria",
    publicationFailed: "Não foi possível alterar a visibilidade na galeria. Tente novamente.",
  },
  de: {
    dictionary: "Traumlexikon", dreamers: "Deine Träume", empty: "Es wurden noch keine Traumbilder geteilt.",
    loading: "Traumbilder werden geladen …", more: "Mehr laden", retry: "Erneut versuchen", unavailable: "Die Galerie ist vorübergehend nicht verfügbar.",
    like: "Traumbild gefällt mir", unlike: "Gefällt mir zurücknehmen", publish: "In der Galerie veröffentlichen", unpublish: "Aus der Galerie entfernen",
    publicationFailed: "Die Sichtbarkeit in der Galerie konnte nicht geändert werden. Versuche es erneut.",
  },
  ru: {
    dictionary: "Словарь", dreamers: "Ваши сны", empty: "Пока никто не поделился иллюстрацией сна.",
    loading: "Загружаем иллюстрации…", more: "Загрузить ещё", retry: "Попробовать снова", unavailable: "Галерея временно недоступна.",
    like: "Нравится иллюстрация", unlike: "Убрать отметку «Нравится»", publish: "Опубликовать в галерее", unpublish: "Убрать из галереи",
    publicationFailed: "Не удалось изменить видимость в галерее. Попробуйте снова.",
  },
  ja: {
    dictionary: "夢辞典", dreamers: "あなたの夢", empty: "共有された夢のイラストはまだありません。",
    loading: "イラストを読み込んでいます…", more: "もっと見る", retry: "もう一度試す", unavailable: "現在ギャラリーを表示できません。",
    like: "イラストにいいね", unlike: "いいねを取り消す", publish: "ギャラリーに公開", unpublish: "ギャラリーから削除",
    publicationFailed: "公開設定を変更できませんでした。もう一度お試しください。",
  },
};
