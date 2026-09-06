import type { Locale } from "./config";
import {
  DREAM_GUIDES,
  getDreamGuide,
  GUIDES_FOR_SYMBOL,
  type DreamGuide,
} from "@/lib/dream-guides";
import type { GuideL10n } from "./guides/types";
import { GUIDES_ES } from "./guides/es";
import { GUIDES_AR } from "./guides/ar";
import { GUIDES_PT } from "./guides/pt";
import { GUIDES_DE } from "./guides/de";
import { GUIDES_RU } from "./guides/ru";

const GUIDES_BY_LOCALE: Record<Exclude<Locale, "en">, Record<string, GuideL10n>> = {
  es: GUIDES_ES,
  ar: GUIDES_AR,
  pt: GUIDES_PT,
  de: GUIDES_DE,
  ru: GUIDES_RU,
};

function mergeGuide(shell: DreamGuide, l10n: GuideL10n): DreamGuide {
  return {
    ...shell,
    name: l10n.name,
    title: l10n.title,
    seoTitle: l10n.seoTitle,
    seoDescription: l10n.seoDescription,
    summary: l10n.summary,
    intro: l10n.intro,
    sections: l10n.sections,
    faqs: l10n.faqs,
  };
}

export function getLocalizedGuide(slug: string, locale: Locale): DreamGuide | undefined {
  const shell = getDreamGuide(slug);
  if (!shell) return undefined;
  if (locale === "en") return shell;
  const l10n = GUIDES_BY_LOCALE[locale][slug];
  return l10n ? mergeGuide(shell, l10n) : shell;
}

export function getLocalizedGuides(locale: Locale): DreamGuide[] {
  if (locale === "en") return DREAM_GUIDES;
  return DREAM_GUIDES.map((guide) => {
    const l10n = GUIDES_BY_LOCALE[locale][guide.slug];
    return l10n ? mergeGuide(guide, l10n) : guide;
  });
}

export function getLocalizedGuidesForSymbol(symbolSlug: string, locale: Locale): DreamGuide[] {
  return (GUIDES_FOR_SYMBOL[symbolSlug] ?? [])
    .map((slug) => getLocalizedGuide(slug, locale))
    .filter((guide): guide is DreamGuide => Boolean(guide));
}

export function getLocalizedSiblingGuides(slug: string, locale: Locale): DreamGuide[] {
  return getLocalizedGuides(locale).filter((guide) => guide.slug !== slug);
}
