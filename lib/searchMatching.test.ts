import assert from "node:assert/strict";
import test from "node:test";

import {
  containsWholePhrase,
  isUsefulContainedSlug,
  normalizeMatchText,
  scoreSearchCandidate,
  startsWithSearchText,
} from "./searchMatching";

test("normalizes punctuation, separators, case, and whitespace", () => {
  assert.equal(normalizeMatchText("  Ride_on-a TRAIN! "), "ride on a train");
});

test("matches complete words and phrases only", () => {
  assert.equal(containsWholePhrase("ride on a train", "train"), true);
  assert.equal(containsWholePhrase("ride on a train", "rain"), false);
  assert.equal(containsWholePhrase("cheating in a dream", "eating in a dream"), false);
  assert.equal(containsWholePhrase("dreaming of eating in a dream", "eating in a dream"), true);
});

test("keeps prefix matching for search-as-you-type", () => {
  assert.equal(startsWithSearchText("Walking in a forest", "walki"), true);
  assert.equal(startsWithSearchText("Cheating in a dream", "eating"), false);
});

test("allows meaningful slugs inside longer queries without matching fragments", () => {
  assert.equal(isUsefulContainedSlug("ride on a train", "train"), true);
  assert.equal(isUsefulContainedSlug("ride on a train", "rain"), false);
  assert.equal(isUsefulContainedSlug("sex with my ex", "ex"), false);
});

test("scores the intended entry instead of a word fragment", () => {
  const train = { title: "Train Dream Meaning", slug: "train", aliases: [] };
  const rain = { title: "Rain Dream Meaning", slug: "rain", aliases: ["rain"] };
  const cheating = {
    title: "Cheating Dream Meaning",
    slug: "cheating",
    aliases: ["cheating in a dream"],
  };

  assert.equal(scoreSearchCandidate("ride on a train", train), 2);
  assert.equal(scoreSearchCandidate("ride on a train", rain), 0);
  assert.equal(scoreSearchCandidate("eating in a dream", cheating), 0);
});
