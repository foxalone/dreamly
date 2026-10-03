import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTER1_LAST_TIER, CHAPTER1_SLUGS, CREATURE_TIERS, chapterOneDone, nextTier, openTier } from "./game/creatureTiers";
import { DREAM_DICTIONARY } from "./dream-dictionary";

test("every creature is a top-level dictionary symbol, listed once, with a unique emoji", () => {
  const slugs = CREATURE_TIERS.flatMap((t) => t.slugs);
  assert.equal(new Set(slugs).size, slugs.length);
  const emojis = new Set<string>();
  for (const slug of slugs) {
    const e = DREAM_DICTIONARY[slug];
    assert.ok(e, `missing dictionary entry: ${slug}`);
    assert.ok(!e.parentSlug && !e.comboOf, `${slug} must be a top-level symbol`);
    assert.ok(!emojis.has(e.icon), `duplicate emoji ${e.icon} (${slug})`);
    emojis.add(e.icon);
  }
});

test("tiers unlock in order", () => {
  assert.equal(openTier(0), 1);
  assert.equal(openTier(149), 1);
  assert.equal(openTier(150), 2);
  assert.equal(openTier(29_999_999), 5);
  assert.equal(nextTier(0)?.tier, 2);
});

test("chapter 2 stays hidden until every chapter-1 creature is caught", () => {
  const huge = 10_000_000_000;
  assert.equal(openTier(huge), CHAPTER1_LAST_TIER);
  assert.equal(nextTier(huge), null);
  const almost = Object.fromEntries(CHAPTER1_SLUGS.slice(1).map((s) => [s, 1]));
  assert.equal(chapterOneDone(almost), false);
  const all = Object.fromEntries(CHAPTER1_SLUGS.map((s) => [s, 1]));
  assert.equal(chapterOneDone(all), true);
  assert.equal(openTier(huge, true), CREATURE_TIERS.length);
  assert.equal(openTier(30_000_000, true), 7);
  assert.equal(nextTier(30_000_000, true)?.tier, 8);
});
