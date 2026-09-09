import assert from "node:assert/strict";
import test from "node:test";

import {
  autoContentPreview,
  collectUsedSlugs,
  imageSubjectForEntry,
  pickUnusedDictionaryEntry,
  videoTopicForEntry,
} from "./adminAutoDictionary";
import { getDreamEntry, POPULAR_DREAM_SLUGS } from "./dream-dictionary";

test("formats Beach as a video topic and image subject", () => {
  const beach = getDreamEntry("beach");
  assert.ok(beach);
  assert.equal(videoTopicForEntry(beach), "Beach Dream Meaning");
  assert.equal(imageSubjectForEntry(beach), "beach");
  assert.equal(autoContentPreview(beach).pagePath, "/dreams/beach");
});

test("treats completed video topics and image subjects as used slugs", () => {
  const used = collectUsedSlugs({
    topics: ["What does dreaming about snakes mean?", "Ghost Dream Meaning"],
    subjects: ["beach", "a castle on a hill"],
    slugs: ["flying"],
  });
  assert.equal(used.has("snake"), true);
  assert.equal(used.has("ghost"), true);
  assert.equal(used.has("beach"), true);
  assert.equal(used.has("castle-on-a-hill"), true);
  assert.equal(used.has("flying"), true);
});

test("picks the first unused popular parent before alphabetical leftovers", () => {
  const used = new Set<string>(POPULAR_DREAM_SLUGS.filter((slug) => slug !== "mirror"));
  used.add("snake");
  const picked = pickUnusedDictionaryEntry(used);
  assert.equal(picked.slug, "mirror");
});
