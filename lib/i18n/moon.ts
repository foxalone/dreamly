import type { Locale } from "./config";

type MoonCopy = {
  title: string; description: string; preview: string; hint: string;
  near: string; far: string; reset: string; zoomIn: string; zoomOut: string;
  loading: string; error: string; retry: string; imagery: string; globe: string; credits: string;
};

export const moonMessages: Record<Locale, MoonCopy> = {
  en: {
    title: "The Moon", description: "Explore a lunar globe with surface imagery from NASA’s Lunar Reconnaissance Orbiter.",
    preview: "Preview", hint: "Drag to rotate · Scroll or pinch to zoom", near: "Near side", far: "Far side", reset: "Reset view",
    zoomIn: "Zoom in", zoomOut: "Zoom out", loading: "Loading the Moon…", error: "The lunar globe could not load. Check your connection and WebGL support.",
    retry: "Try again", imagery: "Surface imagery", globe: "Interactive lunar globe", credits: "Image credits",
  },
  es: {
    title: "La Luna", description: "Explora un globo lunar con imágenes de la superficie tomadas por el Lunar Reconnaissance Orbiter de la NASA.",
    preview: "Vista previa", hint: "Arrastra para girar · Usa la rueda o pellizca para acercar", near: "Cara visible", far: "Cara oculta", reset: "Restablecer vista",
    zoomIn: "Acercar", zoomOut: "Alejar", loading: "Cargando la Luna…", error: "No se pudo cargar el globo lunar. Revisa tu conexión y la compatibilidad con WebGL.",
    retry: "Reintentar", imagery: "Imágenes de la superficie", globe: "Globo lunar interactivo", credits: "Créditos de las imágenes",
  },
  ar: {
    title: "القمر", description: "استكشف مجسّمًا تفاعليًا للقمر بصور سطحه من مركبة الاستطلاع القمرية التابعة لناسا.",
    preview: "معاينة", hint: "اسحب للتدوير · مرّر أو باعد بين إصبعيك للتكبير", near: "الجانب القريب", far: "الجانب البعيد", reset: "إعادة ضبط العرض",
    zoomIn: "تكبير", zoomOut: "تصغير", loading: "جارٍ تحميل القمر…", error: "تعذّر تحميل مجسّم القمر. تحقّق من اتصالك ومن دعم المتصفح لتقنية WebGL.",
    retry: "حاول مجددًا", imagery: "صور السطح", globe: "مجسّم قمري تفاعلي", credits: "مصادر الصور",
  },
  pt: {
    title: "A Lua", description: "Explore um globo lunar com imagens da superfície captadas pela sonda Lunar Reconnaissance Orbiter da NASA.",
    preview: "Prévia", hint: "Arraste para girar · Use a roda ou o gesto de pinça para ampliar", near: "Lado visível", far: "Lado oculto", reset: "Redefinir vista",
    zoomIn: "Ampliar", zoomOut: "Reduzir", loading: "Carregando a Lua…", error: "Não foi possível carregar o globo lunar. Verifique sua conexão e o suporte a WebGL.",
    retry: "Tentar novamente", imagery: "Imagens da superfície", globe: "Globo lunar interativo", credits: "Créditos das imagens",
  },
  de: {
    title: "Der Mond", description: "Erkunde einen interaktiven Mondglobus mit Oberflächenbildern des Lunar Reconnaissance Orbiter der NASA.",
    preview: "Vorschau", hint: "Ziehen zum Drehen · Scrollen oder mit zwei Fingern zoomen", near: "Vorderseite", far: "Rückseite", reset: "Ansicht zurücksetzen",
    zoomIn: "Vergrößern", zoomOut: "Verkleinern", loading: "Der Mond wird geladen…", error: "Der Mondglobus konnte nicht geladen werden. Prüfe deine Verbindung und die WebGL-Unterstützung.",
    retry: "Erneut versuchen", imagery: "Oberflächenbilder", globe: "Interaktiver Mondglobus", credits: "Bildnachweise",
  },
  ru: {
    title: "Луна", description: "Исследуйте лунный глобус со снимками поверхности от аппарата NASA Lunar Reconnaissance Orbiter.",
    preview: "Предпросмотр", hint: "Перетаскивайте для вращения · Колесо мыши или жест двумя пальцами — масштаб", near: "Видимая сторона", far: "Обратная сторона", reset: "Сбросить вид",
    zoomIn: "Приблизить", zoomOut: "Отдалить", loading: "Загружаем Луну…", error: "Не удалось загрузить лунный глобус. Проверьте подключение и поддержку WebGL в браузере.",
    retry: "Попробовать снова", imagery: "Снимки поверхности", globe: "Интерактивный лунный глобус", credits: "Источники изображений",
  },
};
