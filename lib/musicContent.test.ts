import assert from "node:assert/strict";
import test from "node:test";
import { getDreamEntry, PARENT_DREAMS } from "./dream-dictionary";
import { LOCALES } from "./i18n/config";
import { getLocalizedEntry } from "./i18n/localize-dictionary";
import { MUSIC_CONTENT } from "./dreams/music-content";
import { guideTextLinks, isKnownGuideHref } from "./guideLinks";

const proseKeys = ["introduction", "general", "psychological", "spiritual", "islamic", "biblical"] as const;

test("the new article is the dictionary target for the musical-notes map icon", () => {
  assert.equal(PARENT_DREAMS.find((entry) => entry.icon === "🎶")?.slug, "music");
  const entry = getDreamEntry("music");
  assert.ok(entry);
  assert.equal(entry.icon, "🎶");
  assert.equal(entry.updatedAt, "2026-10-23");
  for (const slug of entry.relatedSymbols) assert.ok(getDreamEntry(slug), slug);
});

test("every language has a complete native article, related links, eight scenarios and five FAQs", () => {
  for (const locale of LOCALES) {
    const entry = getLocalizedEntry("music", locale);
    assert.ok(entry, locale);
    assert.deepEqual(entry.sections, MUSIC_CONTENT[locale].sections);
    let links = 0;
    for (const key of proseKeys) {
      assert.ok(entry.sections[key].length >= 2, `${locale}/${key}`);
      for (const paragraph of entry.sections[key]) {
        for (const link of guideTextLinks(paragraph)) {
          assert.ok(isKnownGuideHref(link), `${locale}: ${link}`);
          links += 1;
        }
      }
    }
    assert.ok(links >= 9, locale);
    assert.equal(entry.sections.commonScenarios.length, 8);
    assert.equal(entry.sections.faq.length, 5);
  }
});
