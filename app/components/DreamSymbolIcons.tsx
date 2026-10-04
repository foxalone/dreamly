import React from "react";
import { DREAM_ICONS_EN, type DreamIconKey } from "@/lib/dream-icons/dreamIcons.en";

/** Decorative symbols supplement the dream text and localized root words. */
export function DreamSymbolIcons({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-2 opacity-90" aria-hidden="true">
      {keys.filter((key) => DREAM_ICONS_EN[key as DreamIconKey]?.Icon).slice(0, 4).map((key, index) => {
        const Icon = DREAM_ICONS_EN[key as DreamIconKey].Icon;
        return <Icon key={`${key}:${index}`} size={18} strokeWidth={1.8} />;
      })}
    </span>
  );
}
