import assert from "node:assert/strict";
import test from "node:test";
import { applyDailySnapshot, closeDailySnapshot, localDayKey, shiftDayKey, SNAPSHOT_KEEP_DAYS, startOfLocalDayMs } from "./contentCounts";
import { jerusalemMidnightMs } from "./clickDay";

const current = {
  dreams: 10, stories: 4, journal: 2, shared: 3, moon: 5, earth: 7,
  translation: 6, horoscopeMore: 8, tarotMore: 11, comments: 4, xp: 2,
};
const noNewContent = { dreams: 0, stories: 0, journal: 0, shared: 0 };

test("local day follows the visitor offset, not UTC", () => {
  const now = Date.parse("2026-10-31T14:25:00Z");
  assert.equal(localDayKey(now, -120), "2026-10-31");
  assert.equal(localDayKey(now, 600), "2026-10-31");
  assert.equal(startOfLocalDayMs(now, -120), Date.parse("2026-10-30T22:00:00Z"));
  assert.equal(shiftDayKey("2026-10-31", -1), "2026-10-30");
});

test("Jerusalem midnight uses the offset before the clock changes later that day", () => {
  assert.equal(jerusalemMidnightMs("2026-03-27"), Date.parse("2026-03-26T22:00:00Z"));
  assert.equal(jerusalemMidnightMs("2026-03-28"), Date.parse("2026-03-27T21:00:00Z"));
  assert.equal(jerusalemMidnightMs("2026-10-25"), Date.parse("2026-10-24T21:00:00Z"));
  assert.equal(jerusalemMidnightMs("2026-10-26"), Date.parse("2026-10-25T22:00:00Z"));
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
    current: { ...current, dreams: 12, journal: 1, moon: 8, earth: 11, translation: 8, tarotMore: 16, comments: 3, xp: 4 },
    addedToday: { dreams: 2, stories: 0, journal: 0, shared: 0 },
    stored: first.days,
  });
  assert.deepEqual(next.delta, {
    dreams: 2, stories: 0, journal: -1, shared: 0, moon: 3, earth: 4,
    translation: 2, horoscopeMore: 0, tarotMore: 5, comments: -1, xp: 2,
  });
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
  assert.equal(delta.translation, null);
  assert.equal(delta.horoscopeMore, null);
  assert.equal(delta.tarotMore, null);
  assert.equal(delta.comments, null);
  assert.equal(delta.xp, null);
});

test("the nightly close fills yesterday without an admin visit and replaces interim totals", () => {
  const day = "2026-11-08";
  const todayKey = "2026-11-09";
  const closedAtMs = jerusalemMidnightMs(todayKey);
  const interim = applyDailySnapshot({ todayKey, current, addedToday: noNewContent, stored: {} }).days;
  assert.equal(interim[day].inferred, true);

  const totalsAtMidnight = { ...current, translation: 2, comments: 5 };
  const stored = closeDailySnapshot(interim, day, totalsAtMidnight, closedAtMs);
  assert.deepEqual(stored[day], { ...totalsAtMidnight, closedAtMs });
  assert.deepEqual(stored[todayKey], current);
  const next = applyDailySnapshot({ todayKey, current, addedToday: noNewContent, stored });
  assert.equal(next.delta.translation, 4);
  assert.equal(next.delta.comments, -1);

  const lateRefresh = applyDailySnapshot({ todayKey: day, current, addedToday: noNewContent, stored });
  assert.deepEqual(lateRefresh.days[day], stored[day]);
  assert.deepEqual(lateRefresh.days[todayKey], stored[todayKey]);
  assert.deepEqual(closeDailySnapshot({}, day, totalsAtMidnight, closedAtMs), { [day]: stored[day] });
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
