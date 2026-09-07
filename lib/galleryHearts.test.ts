import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidGalleryHeartSlugFormat,
  normalizeGalleryHeartSlug,
  safeHeartCount,
} from "./galleryHearts";

test("normalizes heart slugs", () => {
  assert.equal(normalizeGalleryHeartSlug(" Snake "), "snake");
  assert.equal(normalizeGalleryHeartSlug("teeth-falling-out"), "teeth-falling-out");
});

test("accepts dictionary-style slugs", () => {
  assert.equal(isValidGalleryHeartSlugFormat("snake"), true);
  assert.equal(isValidGalleryHeartSlugFormat("teeth-falling-out"), true);
  assert.equal(isValidGalleryHeartSlugFormat("baby"), true);
});

test("rejects junk slugs", () => {
  assert.equal(isValidGalleryHeartSlugFormat(""), false);
  assert.equal(isValidGalleryHeartSlugFormat("Snake"), false);
  assert.equal(isValidGalleryHeartSlugFormat("../users"), false);
  assert.equal(isValidGalleryHeartSlugFormat("a".repeat(81)), false);
});

test("clamps heart counts", () => {
  assert.equal(safeHeartCount(12), 12);
  assert.equal(safeHeartCount(-3), 0);
  assert.equal(safeHeartCount("1.8"), 1);
  assert.equal(safeHeartCount("nope"), 0);
});
