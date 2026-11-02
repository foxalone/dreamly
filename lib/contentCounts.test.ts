import assert from "node:assert/strict";
import test from "node:test";
import { applyDailySnapshot, localDayKey, shiftDayKey, startOfLocalDayMs } from "./contentCounts";

const current = { dreams: 10, stories: 4, journal: 2, shared: 3, moon: 5, earth: 7 };

test("local day follows the visitor offset, not UTC", () => {
  const now = Date.parse("2026-10-31T14:25:00Z");
  assert.equal(localDayKey(now, -120), "2026-10-31");
  assert.equal(localDayKey(now, 600), "2026-10-31");
  assert.equal(startOfLocalDayMs(now, -120), Date.parse("2026-10-30T22:00:00Z"));
  assert.equal(shiftDayKey("2026-10-31", -1), "2026-10-30");
});

test("the first look infers yesterday from what was created today", () => {
  const { delta, days } = applyDailySnapshot({
    todayKey: "2026-10-31",
    current,
    addedToday: { dreams: 2, stories: 1, journal: 0, shared: 1 },
    stored: {},
  });
  assert.deepEqual(
    { dreams: delta.dreams, stories: delta.stories, journal: delta.journal, shared: delta.shared },
    { dreams: 2, stories: 1, journal: 0, shared: 1 },
  );
  assert.equal(delta.moon, null);
  assert.equal(delta.earth, null);
  assert.equal(days["2026-10-30"].dreams, 8);
  assert.equal(days["2026-10-30"].inferred, true);
});

test("a later change the same day counts against the frozen baseline", () => {
  const first = applyDailySnapshot({
    todayKey: "2026-10-31",
    current,
    addedToday: { dreams: 2, stories: 0, journal: 0, shared: 0 },
    stored: {},
  });
  const later = applyDailySnapshot({
    todayKey: "2026-10-31",
    current: { ...current, dreams: 9, stories: 5 },
    addedToday: { dreams: 9, stories: 5, journal: 2, shared: 3 },
    stored: first.days,
  });
  assert.equal(later.delta.dreams, 1);
  assert.equal(later.delta.stories, 1);
  assert.equal(later.days["2026-10-30"].dreams, 8);
});

test("the next day uses the real snapshot, including the moon", () => {
  const first = applyDailySnapshot({
    todayKey: "2026-10-31",
    current,
    addedToday: { dreams: 1, stories: 0, journal: 0, shared: 0 },
    stored: {},
  });
  const next = applyDailySnapshot({
    todayKey: "2026-11-01",
    current: { dreams: 12, stories: 4, journal: 1, shared: 3, moon: 8, earth: 11 },
    addedToday: { dreams: 2, stories: 0, journal: 0, shared: 0 },
    stored: first.days,
  });
  assert.equal(next.delta.dreams, 2);
  assert.equal(next.delta.journal, -1);
  assert.equal(next.delta.moon, 3);
  assert.equal(next.delta.earth, 4);
});

test("a snapshot from before Earth tracking counts as zero", () => {
  const { delta } = applyDailySnapshot({
    todayKey: "2026-11-01",
    current: { ...current, earth: 4 },
    addedToday: { dreams: 0, stories: 0, journal: 0, shared: 0 },
    stored: {
      "2026-10-31": { dreams: 10, stories: 4, journal: 2, shared: 3, moon: 5 },
    },
  });
  assert.equal(delta.earth, 4);
  assert.equal(delta.moon, 0);
});
