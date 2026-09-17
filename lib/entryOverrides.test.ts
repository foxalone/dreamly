import assert from "node:assert/strict";
import test from "node:test";

import { ALL_DREAM_ENTRIES, COMBINATION_ENTRIES, DREAM_DICTIONARY, type DreamSections } from "./dream-dictionary";
import { guideTextLinks, isKnownGuideHref } from "./guideLinks";
import { LOCALES, type Locale } from "./i18n/config";
import { ENTRY_OVERRIDES } from "./i18n/entry-overrides";
import type { EntryL10nOverride } from "./i18n/entry-overrides/types";
import { getLocalizedEntries, getLocalizedEntry } from "./i18n/localize-dictionary";
import { getSeedL10n } from "./i18n/seeds";

const OVERRIDES = Object.entries(ENTRY_OVERRIDES) as [Exclude<Locale, "en">, Record<string, EntryL10nOverride>][];

const PROSE_KEYS = ["introduction", "general", "psychological", "spiritual", "islamic", "biblical"] as const;

function linkProblems(where: string, sections: Partial<DreamSections>): string[] {
  const problems: string[] = [];
  for (const key of PROSE_KEYS) {
    (sections[key] ?? []).forEach((paragraph, index) => {
      const links = guideTextLinks(paragraph);
      // quickSymbol, dream-lenses and dreamImageTarget read the first paragraph as plain text.
      if (index === 0 && links.length) problems.push(`${where} ${key}[0] must stay plain text`);
      for (const href of links) {
        if (!isKnownGuideHref(href)) problems.push(`${where} ${key}[${index}] unknown link ${href}`);
      }
    });
  }
  const plainOnly = [
    ...(sections.commonScenarios ?? []).flatMap((row) => [row.title, row.meaning]),
    ...(sections.faq ?? []).flatMap((row) => [row.question, row.answer]),
  ];
  for (const text of plainOnly) {
    if (/\]\(\//.test(text)) problems.push(`${where} link markup in FAQ or scenarios`);
  }
  return problems;
}

test("entry overrides only target existing entries that have a seed in that locale", () => {
  for (const [locale, overrides] of OVERRIDES) {
    for (const slug of Object.keys(overrides)) {
      assert.ok(DREAM_DICTIONARY[slug], `${locale} override for unknown entry ${slug}`);
      assert.ok(getSeedL10n(locale, slug)?.name, `${locale} override ${slug} has no seed name`);
    }
  }
});

test("entry overrides keep the section shape and SEO limits", () => {
  for (const [locale, overrides] of OVERRIDES) {
    for (const [slug, override] of Object.entries(overrides)) {
      if (override.seoTitle) assert.ok(override.seoTitle.length <= 70, `${locale}/${slug} seoTitle too long`);
      if (override.seoDescription) assert.ok(override.seoDescription.length <= 170, `${locale}/${slug} seoDescription too long`);
      for (const [key, value] of Object.entries(override.sections ?? {})) {
        assert.ok(Array.isArray(value) && value.length > 0, `${locale}/${slug} ${key} is empty`);
      }
      assert.deepEqual(linkProblems(`${locale}/${slug}`, override.sections ?? {}), []);
    }
  }
});

test("localized entries use their native overrides", () => {
  for (const [locale, overrides] of OVERRIDES) {
    for (const [slug, override] of Object.entries(overrides)) {
      const entry = getLocalizedEntry(slug, locale);
      assert.ok(entry, `${locale}/${slug} missing`);
      if (override.seoTitle) assert.equal(entry.seoTitle, override.seoTitle);
      if (override.sections?.introduction) assert.deepEqual(entry.sections.introduction, override.sections.introduction);
      assert.ok(entry.sections.faq.length > 0);
    }
  }
});

test("inline links in dictionary sections are known and never in first paragraphs, FAQ or scenarios", () => {
  const problems: string[] = [];
  for (const locale of LOCALES) {
    for (const entry of getLocalizedEntries(locale)) problems.push(...linkProblems(`${locale}/${entry.slug}`, entry.sections));
  }
  assert.deepEqual(problems, []);
});

test("every combination page has a native name in every locale", () => {
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    for (const combo of COMBINATION_ENTRIES) {
      assert.ok(getSeedL10n(locale, combo.slug)?.name, `${locale} has no seed for ${combo.slug}`);
    }
  }
  assert.ok(ALL_DREAM_ENTRIES.length >= COMBINATION_ENTRIES.length);
});
