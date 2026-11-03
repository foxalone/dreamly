import type { Locale } from "./config";

type Copy = {
  title: string;
  note: string;
  refresh: string;
  loading: string;
  error: string;
  dreams: string;
  stories: string;
  journal: string;
  shared: string;
  earth: string;
  translation: string;
  translationNote: string;
  sinceYesterday: string;
};
export const adminMoonClicksCopy: Record<Locale, Copy> = {
  en: { title: "Moon clicks", note: "Moon: map and home. Earth: the globe, home, and the game · admin clicks excluded · counted since tracking began, including repeat clicks", refresh: "Refresh", loading: "Loading…", error: "Could not load click counts.", dreams: "Dreams", stories: "Stories", journal: "Diary", shared: "Shared", earth: "Earth clicks", translation: "Feed translation clicks", translationNote: "Feed translation icon · admin clicks excluded · counted from the start of tracking, including repeat clicks and clicks without a completed translation.", sinceYesterday: "since yesterday" },
  es: { title: "Clics en la Luna", note: "Luna: mapa e inicio. Tierra: el globo, el inicio y el juego · excluye los clics del administrador · desde el inicio del registro, incluidos los clics repetidos", refresh: "Actualizar", loading: "Cargando…", error: "No se pudieron cargar los clics.", dreams: "Sueños", stories: "Historias", journal: "Diario", shared: "Compartidos", earth: "Clics en la Tierra", translation: "Clics en traducir en el feed", translationNote: "Icono de traducción del feed · sin clics del administrador · desde el inicio del registro, incluidos los clics repetidos y los que no terminaron en traducción.", sinceYesterday: "desde ayer" },
  ar: { title: "نقرات القمر", note: "القمر: الخريطة والصفحة الرئيسية. الأرض: الكرة والصفحة الرئيسية واللعبة · باستثناء نقرات المشرف · منذ بدء التتبع، بما فيها النقرات المتكررة", refresh: "تحديث", loading: "جارٍ التحميل…", error: "تعذّر تحميل عدد النقرات.", dreams: "الأحلام", stories: "القصص", journal: "اليوميات", shared: "المشاركات", earth: "نقرات الأرض", translation: "نقرات الترجمة في الموجز", translationNote: "أيقونة الترجمة في الموجز · باستثناء نقرات المشرف · منذ بدء التتبع، بما فيها النقرات المتكررة والنقرات التي لم تكتمل بعدها الترجمة.", sinceYesterday: "منذ أمس" },
  pt: { title: "Cliques na Lua", note: "Lua: mapa e início. Terra: o globo, a página inicial e o jogo · cliques do administrador excluídos · desde o início do registro, incluindo cliques repetidos", refresh: "Atualizar", loading: "Carregando…", error: "Não foi possível carregar os cliques.", dreams: "Sonhos", stories: "Histórias", journal: "Diário", shared: "Compartilhados", earth: "Cliques na Terra", translation: "Cliques na tradução do feed", translationNote: "Ícone de tradução do feed · sem cliques do administrador · desde o início do registro, incluindo cliques repetidos e cliques sem tradução concluída.", sinceYesterday: "desde ontem" },
  de: { title: "Klicks auf den Mond", note: "Mond: Karte und Startseite. Erde: der Globus, die Startseite und das Spiel · ohne Admin-Klicks · seit Beginn der Erfassung, einschließlich wiederholter Klicks", refresh: "Aktualisieren", loading: "Wird geladen…", error: "Die Klickzahlen konnten nicht geladen werden.", dreams: "Träume", stories: "Geschichten", journal: "Tagebuch", shared: "Geteilt", earth: "Klicks auf die Erde", translation: "Klicks auf Übersetzen im Feed", translationNote: "Übersetzungssymbol im Feed · ohne Admin-Klicks · seit Beginn der Erfassung, einschließlich wiederholter Klicks und Klicks ohne abgeschlossene Übersetzung.", sinceYesterday: "seit gestern" },
  ru: { title: "Нажатия на Луну", note: "Луна: карта и главная. Земля: глобус, главная и игра · без нажатий администратора · с начала сбора статистики, включая повторные нажатия", refresh: "Обновить", loading: "Загрузка…", error: "Не удалось загрузить число нажатий.", dreams: "Сны", stories: "Истории", journal: "Дневник", shared: "Опубликованные", earth: "Нажатия на Землю", translation: "Нажатия на перевод в ленте", translationNote: "Значок перевода в ленте · без нажатий администратора · с начала сбора статистики, включая повторные нажатия и нажатия без завершённого перевода.", sinceYesterday: "со вчера" },
};
