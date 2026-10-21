import type { Locale } from "./config";

export const adMessages: Record<Locale, { label: string; preview: string }> = {
  en: { label: "Advertisement", preview: "Ad preview" },
  es: { label: "Publicidad", preview: "Vista previa del anuncio" },
  ar: { label: "إعلان", preview: "معاينة الإعلان" },
  pt: { label: "Publicidade", preview: "Prévia do anúncio" },
  de: { label: "Werbung", preview: "Anzeigenvorschau" },
  ru: { label: "Реклама", preview: "Предпросмотр рекламы" },
};
