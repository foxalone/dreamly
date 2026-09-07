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
