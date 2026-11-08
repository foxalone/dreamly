import type { Locale } from "./config";

type Copy = {
  tab: string;
  subtitle: string;
  title: string;
  note: string;
  loading: string;
  error: string;
  empty: string;
  refresh: string;
  unknown: string;
};

export const adminChartsCopy: Record<Locale, Copy> = {
  en: {
    tab: "Charts",
    subtitle: "Daily totals on one chart",
    title: "Daily totals",
    note: "Each point is that day's total. Dreams, stories, diary, shares, comments, and XP follow the creation date in your timezone. Clicks are the change since the previous saved total. Translation, horoscope, and tarot clicks are stored per day from the day this chart shipped.",
    loading: "Loading…",
    error: "Could not load the chart.",
    empty: "Turn a metric on to draw it.",
    refresh: "Refresh",
    unknown: "—",
  },
  es: {
    tab: "Charts",
    subtitle: "Totales diarios en un solo gráfico",
    title: "Totales diarios",
    note: "Cada punto es el total de ese día. Sueños, historias, diario, publicaciones, comentarios y XP usan la fecha de creación en tu zona horaria. Los clics muestran el cambio desde el total guardado anterior. Los clics de traducción, horóscopo y tarot se guardan por día desde que existe este gráfico.",
    loading: "Cargando…",
    error: "No se pudo cargar el gráfico.",
    empty: "Activa una métrica para verla.",
    refresh: "Actualizar",
    unknown: "—",
  },
  ar: {
    tab: "Charts",
    subtitle: "المجاميع اليومية في رسم واحد",
    title: "المجاميع اليومية",
    note: "كل نقطة هي مجموع ذلك اليوم. الأحلام والقصص واليوميات والمشاركات والتعليقات ونقاط الخبرة تُحسب بتاريخ إنشائها في منطقتك الزمنية. النقرات تُظهر الفرق عن آخر مجموع محفوظ. نقرات الترجمة والأبراج والتاروت تُحفظ لكل يوم منذ إطلاق هذا الرسم.",
    loading: "جارٍ التحميل…",
    error: "تعذّر تحميل الرسم.",
    empty: "فعّل مقياسًا لعرضه.",
    refresh: "تحديث",
    unknown: "—",
  },
  pt: {
    tab: "Charts",
    subtitle: "Totais diários em um gráfico",
    title: "Totais diários",
    note: "Cada ponto é o total daquele dia. Sonhos, histórias, diário, publicações, comentários e XP usam a data de criação no seu fuso. Os cliques mostram a variação desde o total salvo anterior. Cliques de tradução, horóscopo e tarô passam a ser guardados por dia a partir deste gráfico.",
    loading: "Carregando…",
    error: "Não foi possível carregar o gráfico.",
    empty: "Ative uma métrica para desenhá-la.",
    refresh: "Atualizar",
    unknown: "—",
  },
  de: {
    tab: "Charts",
    subtitle: "Tageswerte in einem Diagramm",
    title: "Tageswerte",
    note: "Jeder Punkt ist die Summe dieses Tages. Träume, Geschichten, Tagebuch, geteilte Einträge, Kommentare und XP folgen dem Erstellungsdatum in deiner Zeitzone. Klicks zeigen die Änderung seit der zuletzt gespeicherten Summe. Übersetzungs-, Horoskop- und Tarot-Klicks werden ab diesem Diagramm tageweise gespeichert.",
    loading: "Wird geladen…",
    error: "Das Diagramm konnte nicht geladen werden.",
    empty: "Schalte eine Kennzahl ein, um sie zu zeichnen.",
    refresh: "Aktualisieren",
    unknown: "—",
  },
  ru: {
    tab: "Charts",
    subtitle: "Сумма за день на одном графике",
    title: "Сумма за день",
    note: "Каждая точка — сумма за этот день, а не общий итог. Сны, истории, дневник, публикации, комментарии и XP считаются по дате создания в вашем часовом поясе. Нажатия — это изменение с прошлого сохранённого итога. Нажатия на перевод, гороскоп и Таро пишутся по дням с появления этого графика.",
    loading: "Загрузка…",
    error: "Не удалось загрузить график.",
    empty: "Включите метрику, чтобы увидеть её на графике.",
    refresh: "Обновить",
    unknown: "—",
  },
};
