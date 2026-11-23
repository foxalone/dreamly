import type { Locale } from "./config";

type Copy = {
  create: string; createWithAd: string; view: string; title: string; watch: string; preparingAd: string; generating: string; waiting: string;
  unavailable: string; interrupted: string; pending: string; failed: string; retry: string; close: string;
};

export const dreamImageCopy: Record<Locale, Copy> = {
  en: {
    create: "Create image", createWithAd: "Watch ad for image", view: "View image", title: "Your Dream, Visualized",
    watch: "Watch ad", preparingAd: "Preparing your ad…", generating: "Illustrating your dream", waiting: "We’re preparing your image. This can take a moment.",
    unavailable: "AI image generation is temporarily unavailable. Please try again later.", interrupted: "Finish the ad to unlock your image.",
    pending: "We’re still confirming the ad. Open this dream image again in a moment.",
    failed: "The image couldn’t be created. You can retry here.", retry: "Try again", close: "Close",
  },
  es: {
    create: "Crear imagen", createWithAd: "Ver anuncio para crear imagen", view: "Ver imagen", title: "Tu sueño en una imagen",
    watch: "Ver anuncio", preparingAd: "Preparando el anuncio…", generating: "Estamos ilustrando tu sueño", waiting: "Estamos preparando tu imagen. Puede tardar un momento.",
    unavailable: "La generación de imágenes con IA no está disponible en este momento. Inténtalo más tarde.", interrupted: "Termina de ver el anuncio para desbloquear la imagen.",
    pending: "Todavía estamos confirmando el anuncio. Vuelve a abrir la imagen del sueño en un momento.",
    failed: "No se pudo crear la imagen. Puedes volver a intentarlo aquí.", retry: "Reintentar", close: "Cerrar",
  },
  ar: {
    create: "إنشاء صورة", createWithAd: "شاهد إعلانًا لإنشاء صورة", view: "عرض الصورة", title: "حلمك في صورة",
    watch: "مشاهدة الإعلان", preparingAd: "جارٍ تحضير الإعلان…", generating: "نرسم حلمك", waiting: "نعمل على إعداد صورتك. قد يستغرق ذلك لحظات.",
    unavailable: "إنشاء الصور بالذكاء الاصطناعي غير متاح مؤقتًا. يُرجى المحاولة لاحقًا.", interrupted: "أكمل مشاهدة الإعلان لفتح صورتك.",
    pending: "ما زلنا نتحقق من مشاهدة الإعلان. افتح صورة الحلم مجددًا بعد قليل.",
    failed: "تعذّر إنشاء الصورة. يمكنك إعادة المحاولة هنا.", retry: "إعادة المحاولة", close: "إغلاق",
  },
  pt: {
    create: "Criar imagem", createWithAd: "Ver anúncio para criar imagem", view: "Ver imagem", title: "Seu sonho em uma imagem",
    watch: "Assistir ao anúncio", preparingAd: "Preparando o anúncio…", generating: "Ilustrando seu sonho", waiting: "Estamos preparando sua imagem. Isso pode levar um instante.",
    unavailable: "A geração de imagens com IA está temporariamente indisponível. Tente novamente mais tarde.", interrupted: "Assista ao anúncio até o fim para liberar a imagem.",
    pending: "Ainda estamos confirmando o anúncio. Abra a imagem do sonho novamente em instantes.",
    failed: "Não foi possível criar a imagem. Você pode tentar novamente aqui.", retry: "Tentar novamente", close: "Fechar",
  },
  de: {
    create: "Bild erstellen", createWithAd: "Anzeige für Bild ansehen", view: "Bild ansehen", title: "Dein Traum als Bild",
    watch: "Anzeige ansehen", preparingAd: "Anzeige wird vorbereitet…", generating: "Dein Traum wird zum Bild", waiting: "Wir erstellen dein Bild. Das kann einen Moment dauern.",
    unavailable: "Die KI-Bilderstellung ist vorübergehend nicht verfügbar. Versuche es später erneut.", interrupted: "Sieh dir die Anzeige bis zum Ende an, um dein Bild freizuschalten.",
    pending: "Wir bestätigen die Anzeige noch. Öffne das Traumbild in Kürze erneut.",
    failed: "Das Bild konnte nicht erstellt werden. Du kannst es hier erneut versuchen.", retry: "Erneut versuchen", close: "Schließen",
  },
  ru: {
    create: "Создать картинку", createWithAd: "Картинка за рекламу", view: "Смотреть картинку", title: "Визуализация сна",
    watch: "Смотреть рекламу", preparingAd: "Готовим рекламу…", generating: "Рисуем ваш сон", waiting: "Готовим картинку. Это может занять немного времени.",
    unavailable: "Генерация изображений временно недоступна. Попробуйте позже.", interrupted: "Досмотрите рекламу, чтобы открыть картинку.",
    pending: "Рекламная сеть ещё подтверждает просмотр. Откройте картинку сна чуть позже.",
    failed: "Создать картинку не удалось. Можно попробовать снова.", retry: "Попробовать снова", close: "Закрыть",
  },
  ja: {
    create: "画像を作る", createWithAd: "広告を見て画像を作る", view: "画像を見る", title: "夢を描いた一枚",
    watch: "広告を見る", preparingAd: "広告を準備しています…", generating: "夢をイラストにしています", waiting: "画像を作成しています。少しお待ちください。",
    unavailable: "現在、画像を作成できません。時間をおいてもう一度お試しください。", interrupted: "画像を見るには広告を最後までご覧ください。",
    pending: "広告の視聴を確認しています。少し待ってから、もう一度画像を開いてください。",
    failed: "画像を作成できませんでした。もう一度お試しください。", retry: "もう一度試す", close: "閉じる",
  },
};
