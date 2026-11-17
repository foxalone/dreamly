import type { Locale } from "./config";

export const yourfitPromoCopy: Record<Locale, { label: string; body: string; cta: string; close: string; countdown: string }> = {
  ja: { close: "広告を閉じる", countdown: "あと{seconds}秒で閉じられます", label: "広告", body: "トレーニングを記録して、成長を確認しましょう。", cta: "YourFitを開く" },
  en: { close: "Close advertisement", countdown: "Close in {seconds} seconds", label: "Promotion", body: "Track your workouts and see your progress.", cta: "Open YourFit" },
  es: { close: "Cerrar anuncio", countdown: "Cerrar en {seconds} segundos", label: "Promoción", body: "Registra tus entrenamientos y sigue tu progreso.", cta: "Abrir YourFit" },
  ar: { close: "إغلاق الإعلان", countdown: "يمكن الإغلاق بعد {seconds} ثوانٍ", label: "إعلان", body: "سجّل تمارينك وتابع تقدّمك.", cta: "افتح YourFit" },
  pt: { close: "Fechar anúncio", countdown: "Fechar em {seconds} segundos", label: "Publicidade", body: "Registre seus treinos e acompanhe seu progresso.", cta: "Abrir YourFit" },
  de: { close: "Werbung schließen", countdown: "Schließen in {seconds} Sekunden", label: "Werbung", body: "Halte dein Training fest und verfolge deine Fortschritte.", cta: "YourFit öffnen" },
  ru: { close: "Закрыть рекламу", countdown: "Закрыть через {seconds} с", label: "Промо", body: "Записывайте тренировки и следите за прогрессом.", cta: "Открыть YourFit" },
};

export const yourfitEventCopy: Record<Locale, Record<"yourfit_analysis_ready" | "yourfit_promo_impression" | "yourfit_promo_click", string>> = {
  ja: { yourfit_analysis_ready: "広告がない場合の初回解釈とYourFit紹介を準備", yourfit_promo_impression: "YourFitカードをブラウザーに表示", yourfit_promo_click: "YourFitリンクをクリック" },
  en: { yourfit_analysis_ready: "First no-ad interpretation prepared with YourFit promotion", yourfit_promo_impression: "YourFit card visible in the browser", yourfit_promo_click: "YourFit link clicked" },
  es: { yourfit_analysis_ready: "Primera interpretación sin anuncio preparada con promoción de YourFit", yourfit_promo_impression: "Tarjeta de YourFit visible en el navegador", yourfit_promo_click: "Clic en el enlace de YourFit" },
  ar: { yourfit_analysis_ready: "أُعدّ التفسير الأول عند تعذّر الإعلان مع ترويج YourFit", yourfit_promo_impression: "ظهرت بطاقة YourFit في المتصفح", yourfit_promo_click: "نُقر رابط YourFit" },
  pt: { yourfit_analysis_ready: "Primeira interpretação sem anúncio preparada com promoção do YourFit", yourfit_promo_impression: "Cartão do YourFit visível no navegador", yourfit_promo_click: "Clique no link do YourFit" },
  de: { yourfit_analysis_ready: "Erste Deutung bei fehlender Anzeige mit YourFit-Werbung erstellt", yourfit_promo_impression: "YourFit-Karte im Browser sichtbar", yourfit_promo_click: "YourFit-Link angeklickt" },
  ru: { yourfit_analysis_ready: "Первое толкование при отсутствии рекламы подготовлено с промо YourFit", yourfit_promo_impression: "Карточка YourFit показана в браузере", yourfit_promo_click: "Нажатие на ссылку YourFit" },
};
