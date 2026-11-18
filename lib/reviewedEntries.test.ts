import assert from "node:assert/strict";
import test from "node:test";
import { REVIEWED_SLUGS, type ReviewedArticles } from "./dreams/reviewed-content/article";
import { REVIEWED_EN } from "./dreams/reviewed-content/en";
import { REVIEWED_ES } from "./dreams/reviewed-content/es";
import { REVIEWED_AR } from "./dreams/reviewed-content/ar";
import { REVIEWED_PT } from "./dreams/reviewed-content/pt";
import { REVIEWED_DE } from "./dreams/reviewed-content/de";
import { REVIEWED_RU } from "./dreams/reviewed-content/ru";
import { DICTIONARY_LOCALES, type DictionaryLocale } from "./i18n/config";
import { getLocalizedEntry } from "./i18n/localize-dictionary";

const copy: Record<DictionaryLocale, ReviewedArticles> = {
  en: REVIEWED_EN, es: REVIEWED_ES, ar: REVIEWED_AR,
  pt: REVIEWED_PT, de: REVIEWED_DE, ru: REVIEWED_RU,
};

test("reviewed articles replace the hero, every section, and revision date in all six locales", () => {
  for (const locale of DICTIONARY_LOCALES) {
    for (const slug of REVIEWED_SLUGS) {
      const entry = getLocalizedEntry(slug, locale)!;
      const authored = copy[locale][slug];
      assert.equal(entry.shortMeaning, authored.shortMeaning, `${locale}/${slug}: stale seed in hero`);
      assert.deepEqual(entry.sections, authored.sections, `${locale}/${slug}: template fallback`);
      assert.equal(entry.updatedAt, authored.updatedAt, `${locale}/${slug}: stale sitemap/article date`);
      assert.equal(entry.canonicalSlug, slug, `${locale}/${slug}: URL must remain stable`);
    }
  }
});

test("authored metadata survives English normalization and localized template clipping", () => {
  for (const locale of DICTIONARY_LOCALES) {
    for (const slug of REVIEWED_SLUGS) {
      const entry = getLocalizedEntry(slug, locale)!;
      const authored = copy[locale][slug];
      assert.equal(entry.seoTitle, authored.seoTitle, `${locale}/${slug}: changed title`);
      assert.equal(entry.seoDescription, authored.seoDescription, `${locale}/${slug}: changed description`);
      assert.ok(entry.seoTitle.length <= 70, `${locale}/${slug}: title too long`);
      assert.ok(entry.seoDescription.length <= 170, `${locale}/${slug}: description too long`);
      assert.doesNotMatch(entry.seoDescription, /(?:…|\.\.\.)$/, `${locale}/${slug}: clipped sentence`);
    }
  }
});
