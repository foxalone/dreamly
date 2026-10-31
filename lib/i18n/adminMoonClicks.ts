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
  sinceYesterday: string;
};
export const adminMoonClicksCopy: Record<Locale, Copy> = {
  en: { title: "Moon clicks", note: "Map and home page · admin clicks excluded · counted since tracking began, including repeat clicks", refresh: "Refresh", loading: "Loading…", error: "Could not load Moon clicks.", dreams: "Dreams", stories: "Stories", journal: "Diary", shared: "Shared", sinceYesterday: "since yesterday" },
  es: { title: "Clics en la Luna", note: "Mapa y página de inicio · excluye los clics del administrador · desde el inicio del registro, incluidos los clics repetidos", refresh: "Actualizar", loading: "Cargando…", error: "No se pudieron cargar los clics en la Luna.", dreams: "Sueños", stories: "Historias", journal: "Diario", shared: "Compartidos", sinceYesterday: "desde ayer" },
  ar: { title: "نقرات القمر", note: "الخريطة والصفحة الرئيسية · باستثناء نقرات المشرف · منذ بدء التتبع، بما فيها النقرات المتكررة", refresh: "تحديث", loading: "جارٍ التحميل…", error: "تعذّر تحميل عدد نقرات القمر.", dreams: "الأحلام", stories: "القصص", journal: "اليوميات", shared: "المشاركات", sinceYesterday: "منذ أمس" },
  pt: { title: "Cliques na Lua", note: "Mapa e página inicial · cliques do administrador excluídos · desde o início do registro, incluindo cliques repetidos", refresh: "Atualizar", loading: "Carregando…", error: "Não foi possível carregar os cliques na Lua.", dreams: "Sonhos", stories: "Histórias", journal: "Diário", shared: "Compartilhados", sinceYesterday: "desde ontem" },
  de: { title: "Klicks auf den Mond", note: "Karte und Startseite · ohne Admin-Klicks · seit Beginn der Erfassung, einschließlich wiederholter Klicks", refresh: "Aktualisieren", loading: "Wird geladen…", error: "Die Mond-Klicks konnten nicht geladen werden.", dreams: "Träume", stories: "Geschichten", journal: "Tagebuch", shared: "Geteilt", sinceYesterday: "seit gestern" },
  ru: { title: "Нажатия на Луну", note: "Карта и главная страница · без нажатий администратора · с начала сбора статистики, включая повторные нажатия", refresh: "Обновить", loading: "Загрузка…", error: "Не удалось загрузить число нажатий на Луну.", dreams: "Сны", stories: "Истории", journal: "Дневник", shared: "Опубликованные", sinceYesterday: "со вчера" },
};
