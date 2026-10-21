import assert from "node:assert/strict";
import test from "node:test";
import { DREAM_DICTIONARY } from "./dream-dictionary";
import { LOCALES } from "./i18n/config";
import { getLocalizedEntry } from "./i18n/localize-dictionary";
import { localePath } from "./i18n/path";
import { listPublicPages, SITE_ORIGIN } from "./publicPages";
import { scoreSearchCandidate } from "./searchMatching";
import { findBestDreamMatch } from "./quickSymbol";

const slugs = ["mud", "walking-in-mud", "sinking-in-mud"];

test("the two reported zero-result searches resolve to the intended mud entries", () => {
  for (const [query, slug] of [["Muddy", "mud"], ["Walking in mud", "walking-in-mud"]]) {
    assert.equal(scoreSearchCandidate(query, DREAM_DICTIONARY[slug]), 4);
    assert.equal(findBestDreamMatch(query)?.slug, slug);
  }
});

test("all eighteen mud articles have native prose, discoverable names and sitemap URLs", () => {
  const pages = new Set(listPublicPages().map((page) => page.url));
  for (const slug of slugs) {
    const intros = new Set<string>();
    for (const locale of LOCALES) {
      const entry = getLocalizedEntry(slug, locale)!;
      assert.ok(entry);
      assert.equal(scoreSearchCandidate(entry.name, entry), 4);
      assert.ok(pages.has(`${SITE_ORIGIN}${localePath(`/dreams/${slug}`, locale)}`));
      intros.add(entry.sections.introduction[0]);
      for (const key of ["general", "psychological", "spiritual", "islamic", "biblical"] as const) {
        if (locale !== "en") assert.notEqual(
          entry.sections[key][0], DREAM_DICTIONARY[slug].sections[key][0],
          `${locale}/${slug} must have native ${key}`,
        );
      }
    }
    assert.equal(intros.size, 6);
  }
});
