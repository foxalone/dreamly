import { Bot, Globe2, CircleHelp } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { DreamPlatform } from "@/lib/dreamPlatform";

const copy: Record<Locale, { web: string; unknown: string }> = {
  en: { web: "Web", unknown: "Platform unknown" },
  es: { web: "Web", unknown: "Plataforma desconocida" },
  ar: { web: "الويب", unknown: "المنصة غير معروفة" },
  pt: { web: "Web", unknown: "Plataforma desconhecida" },
  de: { web: "Web", unknown: "Plattform unbekannt" },
  ru: { web: "Веб", unknown: "Платформа неизвестна" },
};

export default function DreamPlatformBadge({ platform, locale }: { platform?: DreamPlatform; locale: Locale }) {
  const label = platform === "android" ? "Android" : copy[locale][platform ?? "unknown"];
  const Icon = platform === "android" ? Bot : platform === "web" ? Globe2 : CircleHelp;
  const color = platform === "android" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : platform === "web" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-neutral-500/15";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 font-semibold ${color}`} title={label}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
