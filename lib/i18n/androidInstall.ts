import type { Locale } from "./config";

export type AndroidInstallCopy = {
  title: string;
  get: string;
  close: string;
  badge: string;
};

export const androidInstallCopy: Partial<Record<Locale, AndroidInstallCopy>> = {
  en: { title: "Dreamly is better on Android", get: "Get Dreamly on Google Play", close: "Close Android banner", badge: "en" },
  es: { title: "Dreamly es mejor en Android", get: "Descarga Dreamly en Google Play", close: "Cerrar el aviso de Android", badge: "es-419" },
  ar: { title: "تجربة Dreamly أفضل على Android", get: "حمّل Dreamly من Google Play", close: "إغلاق إعلان Android", badge: "ar" },
  pt: { title: "O Dreamly é melhor no Android", get: "Baixe o Dreamly no Google Play", close: "Fechar aviso do Android", badge: "pt-br" },
  de: { title: "Dreamly ist auf Android besser", get: "Dreamly bei Google Play herunterladen", close: "Android-Hinweis schließen", badge: "de" },
  ru: { title: "Dreamly лучше на Android", get: "Скачать Dreamly в Google Play", close: "Закрыть баннер Android", badge: "ru" },
};
