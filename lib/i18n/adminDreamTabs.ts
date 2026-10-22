import type { Locale } from "./config";

export const ADMIN_DREAM_TABS_COPY: Record<Locale, { label: string; dreams: string }> = {
  en: { label: "Dream management", dreams: "Dream list" },
  es: { label: "Gestión de sueños", dreams: "Lista de sueños" },
  ar: { label: "إدارة الأحلام", dreams: "قائمة الأحلام" },
  pt: { label: "Gerenciamento de sonhos", dreams: "Lista de sonhos" },
  de: { label: "Traumverwaltung", dreams: "Traumliste" },
  ru: { label: "Управление снами", dreams: "Список снов" },
};
