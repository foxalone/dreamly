import type { Locale } from "./config";
import type { ReactionKey } from "../guestReactions";

const LABELS: Record<Locale, Record<ReactionKey, string>> = {
  en: { heart: "Heart", like: "Like", star: "Star" },
  es: { heart: "Me encanta", like: "Me gusta", star: "Favorito" },
  ar: { heart: "أحببته", like: "أعجبني", star: "مفضّل" },
  pt: { heart: "Amei", like: "Gostei", star: "Favorito" },
  de: { heart: "Herz", like: "Gefällt mir", star: "Favorit" },
  ru: { heart: "Нравится", like: "Одобряю", star: "Избранное" },
};

export function reactionLabel(locale: Locale, key: ReactionKey): string {
  return LABELS[locale][key];
}
