import type { Locale } from "./config";

export const ADMIN_DREAM_TABS_COPY: Record<Locale, { label: string; dreams: string; comments: string }> = {
  en: { label: "Dream management", dreams: "Dream list", comments: "Comments" },
  es: { label: "Gestión de sueños", dreams: "Lista de sueños", comments: "Comentarios" },
  ar: { label: "إدارة الأحلام", dreams: "قائمة الأحلام", comments: "التعليقات" },
  pt: { label: "Gerenciamento de sonhos", dreams: "Lista de sonhos", comments: "Comentários" },
  de: { label: "Traumverwaltung", dreams: "Traumliste", comments: "Kommentare" },
  ru: { label: "Управление снами", dreams: "Список снов", comments: "Комментарии" },
};
