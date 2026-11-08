import assert from "node:assert/strict";
import test from "node:test";
import { applyDailySnapshot, localDayKey, shiftDayKey, SNAPSHOT_KEEP_DAYS, stampTrackedTotals, startOfLocalDayMs } from "./contentCounts";

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

test("tracked totals stick to today and a missing day is left alone", () => {
  const stamped = stampTrackedTotals(
    { "2026-11-08": { dreams: 10, stories: 4, journal: 2, shared: 3, moon: 5, earth: 7 } },
    "2026-11-08",
    { translation: 1, horoscopeMore: 2, tarotMore: 7, comments: 2, xp: 1 },
  );
  assert.equal(stamped["2026-11-08"].moon, 5);
  assert.equal(stamped["2026-11-08"].translation, 1);
  assert.equal(stamped["2026-11-08"].xp, 1);
  assert.deepEqual(stampTrackedTotals({}, "2026-11-08", { translation: 1, horoscopeMore: 0, tarotMore: 0, comments: 0, xp: 0 }), {});
});

test("snapshots are kept for the chart window", () => {
  const stored: Record<string, { dreams: number; stories: number; journal: number; shared: number; moon: number }> = {};
  for (let ago = 0; ago <= SNAPSHOT_KEEP_DAYS + 5; ago += 1) {
    stored[shiftDayKey("2026-11-08", -ago)] = { dreams: 1, stories: 0, journal: 0, shared: 0, moon: 1 };
  }
  const { days } = applyDailySnapshot({
    todayKey: "2026-11-08",
    current,
    addedToday: { dreams: 0, stories: 0, journal: 0, shared: 0 },
    stored,
  });
  assert.ok(days[shiftDayKey("2026-11-08", -SNAPSHOT_KEEP_DAYS)]);
  assert.equal(days[shiftDayKey("2026-11-08", -(SNAPSHOT_KEEP_DAYS + 1))], undefined);
});
