import test from "node:test";
import assert from "node:assert/strict";
import { CREATURE_TIERS, nextTier, openTier } from "./game/creatureTiers";
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
  assert.equal(openTier(30_000_000), CREATURE_TIERS.length);
  assert.equal(nextTier(0)?.tier, 2);
  assert.equal(openTier(29_999_999), CREATURE_TIERS.length - 1);
  assert.equal(nextTier(30_000_000), null);
});
