import assert from "node:assert/strict";
import test from "node:test";

import { DREAM_DICTIONARY } from "./dream-dictionary";
import { DREAM_GUIDE_SLUGS } from "./dream-guides";
import { LOCALES, type Locale } from "./i18n/config";
import { getLocalizedEntry } from "./i18n/localize-dictionary";
import { CTR_EXPERIMENT_META, getCtrExperimentMeta } from "./seo/ctr-experiment";

const ROWS = Object.entries(CTR_EXPERIMENT_META).flatMap(([locale, rows]) =>
  Object.entries(rows ?? {}).map(([slug, meta]) => ({ locale: locale as Locale, slug, meta })),
);

test("CTR experiment covers exactly the 27 pages from docs/seo/ctr-experiment-2026-09.md", () => {
  assert.equal(ROWS.length, 27);
  for (const { locale, slug } of ROWS) {
    assert.ok((LOCALES as readonly string[]).includes(locale), `unknown locale ${locale}`);
    assert.ok(DREAM_DICTIONARY[slug], `${locale}/${slug} is not a dictionary entry`);
    assert.ok(!DREAM_GUIDE_SLUGS.includes(slug), `${locale}/${slug} is a guide, not a symbol page`);
    assert.ok(getLocalizedEntry(slug, locale), `${locale}/${slug} has no localized entry`);
  }
});

test("CTR experiment metadata stays within Google's display limits and differs from the generated copy", () => {
  for (const { locale, slug, meta } of ROWS) {
    const entry = getLocalizedEntry(slug, locale)!;
    assert.ok(meta.title.trim().length > 0 && meta.title.length <= 60, `${locale}/${slug} title length ${meta.title.length}`);
    assert.ok(
      meta.description.trim().length >= 120 && meta.description.length <= 160,
      `${locale}/${slug} description length ${meta.description.length}`,
    );
    assert.equal(meta.title, meta.title.trim());
    assert.equal(meta.description, meta.description.trim());
    assert.notEqual(meta.title, entry.seoTitle, `${locale}/${slug} title unchanged`);
    assert.notEqual(meta.description, entry.seoDescription, `${locale}/${slug} description unchanged`);
    // Metadata only: the experiment must never touch what the page renders.
    assert.equal(entry.seoTitle, getLocalizedEntry(slug, locale)!.seoTitle);
  }
});

test("getCtrExperimentMeta returns nothing for pages outside the experiment", () => {
  assert.equal(getCtrExperimentMeta("snake", "en"), undefined);
  assert.equal(getCtrExperimentMeta("work", "es"), undefined);
  assert.equal(getCtrExperimentMeta("heights", "en"), undefined);
  assert.equal(getCtrExperimentMeta("big-fish", "pt")?.title, "Sonhar com peixe grande: o que significa?");
});
