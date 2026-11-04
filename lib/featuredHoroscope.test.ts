import assert from "node:assert/strict";
import test from "node:test";
import { earliestWorldDay, weekKey, validateFeatured } from "./featuredHoroscope";
import sample from "./featured-horoscope-sample.json";

test("the first calendar day starts at 10:00 UTC in UTC+14", () => {
  assert.equal(earliestWorldDay(Date.parse("2026-11-04T09:59:59Z")), "2026-11-04");
  assert.equal(earliestWorldDay(Date.parse("2026-11-04T10:00:00Z")), "2026-11-05");
});

test("weekly free access resets on Monday in the featured calendar", () => {
  assert.equal(weekKey("2026-11-08"), "2026-11-02");
  assert.equal(weekKey("2026-11-09"), "2026-11-09");
});

test("the model-generated sample has every section", () => {
  const item = validateFeatured(sample);
  assert.equal(item.day, "2026-11-05");
  assert.notEqual(item.model, "sample");
});
