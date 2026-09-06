import type { Locale } from "../config";
import type { UiMessages } from "./types";
import { EN_MESSAGES } from "./en";
import { ES_MESSAGES } from "./es";
import { AR_MESSAGES } from "./ar";
import { PT_MESSAGES } from "./pt";
import { DE_MESSAGES } from "./de";
import { RU_MESSAGES } from "./ru";

const ALL: Record<Locale, UiMessages> = {
  en: EN_MESSAGES,
  es: ES_MESSAGES,
  ar: AR_MESSAGES,
  pt: PT_MESSAGES,
  de: DE_MESSAGES,
  ru: RU_MESSAGES,
};

export function getMessages(locale: Locale): UiMessages {
  return ALL[locale] ?? EN_MESSAGES;
}

export function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
