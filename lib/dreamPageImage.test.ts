import assert from "node:assert/strict";
import test from "node:test";

import { sortDreamPageImages, type DreamPageImageAssignment } from "./dreamPageImage";

function item(slug: string, assignedAt = ""): DreamPageImageAssignment {
  return { slug, imageJobId: slug, imageUrl: `https://img/${slug}`, subject: slug, alt: slug, assignedAt };
}

test("puts the newest assigned images first", () => {
  const sorted = sortDreamPageImages([
    item("wedding", "2026-08-01T10:00:00.000Z"),
    item("hotel", "2026-09-07T08:00:00.000Z"),
    item("spider-and-snake", "2026-09-07T09:00:00.000Z"),
  ]);
  assert.deepEqual(
    sorted.map((image) => image.slug),
    ["spider-and-snake", "hotel", "wedding"],
  );
});

test("keeps images without an assignment date after dated ones", () => {
  const sorted = sortDreamPageImages([item("old-popular"), item("new-hotel", "2026-09-07T09:00:00.000Z")]);
  assert.deepEqual(
    sorted.map((image) => image.slug),
    ["new-hotel", "old-popular"],
  );
});

test("gallery thumbnails snap widths to the allowed set", async () => {
  const { parseGalleryThumbWidth } = await import("./dreamPageImage");
  assert.equal(parseGalleryThumbWidth("100"), 320);
  assert.equal(parseGalleryThumbWidth("320"), 320);
  assert.equal(parseGalleryThumbWidth("400"), 480);
  assert.equal(parseGalleryThumbWidth("5000"), 640);
  assert.equal(parseGalleryThumbWidth("abc"), 480);
  assert.equal(parseGalleryThumbWidth(null), 480);
});

test("gallery thumbnail URLs change when the image changes", async () => {
  const { galleryThumbUrl, galleryThumbSrcSet, galleryThumbVersion } = await import("./dreamPageImage");
  const a = { slug: "snake", imageUrl: "https://img/snake?token=1" };
  const b = { slug: "snake", imageUrl: "https://img/snake?token=2" };
  assert.equal(galleryThumbVersion(a.imageUrl), galleryThumbVersion(a.imageUrl));
  assert.notEqual(galleryThumbUrl(a, 480), galleryThumbUrl(b, 480));
  assert.match(galleryThumbUrl(a, 480), /^\/api\/gallery\/thumb\?slug=snake&w=480&v=[0-9a-z]+$/);
  assert.equal(galleryThumbSrcSet(a).split(", ").length, 3);
  assert.match(galleryThumbSrcSet(a), / 640w$/);
});
