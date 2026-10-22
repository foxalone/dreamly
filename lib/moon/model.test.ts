import { test } from "node:test";
import assert from "node:assert/strict";
import { publishedDreamCount, lunarPoint, MOON_THRESHOLD } from "./model";

test("only five distinct active public dreams unlock the Moon", () => {
  const rows = Array.from({ length: 4 }, (_, i) => ({ id: `a${i}`, data: { ownerDreamId: `d${i}`, text: "dream", sourceType: "dream" } as Record<string, unknown> }));
  rows.push({ id: "duplicate", data: { ownerDreamId: "d0", text: "same dream" } }, { id: "story", data: { text: "story", sourceType: "story" } }, { id: "legacy-story", data: { text: "story", ownerStoryId: "s1" } }, { id: "deleted", data: { text: "deleted", deleted: true } }, { id: "shell", data: { text: " " } });
  assert.equal(publishedDreamCount(rows), 4);
  assert.ok(publishedDreamCount(rows) < MOON_THRESHOLD);
  rows.push({ id: "fifth", data: { text: "fifth dream", ownerDreamId: "d5" } });
  assert.equal(publishedDreamCount(rows), MOON_THRESHOLD);
});

test("random points span the lunar sphere but stay within imagery coverage", () => {
  assert.deepEqual(lunarPoint(.5, .5), { lng: 0, lat: 0 });
  for (let i = 0; i <= 100; i++) {
    const point = lunarPoint(i / 100, i / 100);
    assert.ok(point.lng >= -180 && point.lng <= 180);
    assert.ok(point.lat >= -75.00001 && point.lat <= 75.00001);
  }
});
