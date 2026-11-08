import assert from "node:assert/strict";
import test from "node:test";
import { jerusalemDayKey } from "./clickDay";
import { buildMetricSeries, dailyFromCumulative, readByDay } from "./metricSeries";
import type { DaySnapshot } from "./contentCounts";

const clicks = { moon: 0, earth: 0, translation: 0, horoscopeMore: 0, tarotMore: 0 };

test("jerusalem day follows Israel, including the hours before UTC midnight", () => {
  assert.equal(jerusalemDayKey(new Date("2026-11-07T21:30:00Z")), "2026-11-07");
  assert.equal(jerusalemDayKey(new Date("2026-11-07T22:30:00Z")), "2026-11-08");
});

test("byDay ignores anything that is not a day total", () => {
  assert.deepEqual(readByDay({ "2026-11-08": 2, nope: 5, "2026-11-07": -3, later: "x" }), {
    "2026-11-08": 2,
    "2026-11-07": 0,
  });
  assert.deepEqual(readByDay(null), {});
});

test("click days are the gap between saved totals, and an inferred day does not count", () => {
  const stored: Record<string, DaySnapshot> = {
    "2026-11-06": { dreams: 1, stories: 0, journal: 0, shared: 0, moon: 10, earth: 4 },
    "2026-11-07": { dreams: 1, stories: 0, journal: 0, shared: 0, moon: 15, inferred: true },
  };
  const deltas = dailyFromCumulative(stored, "moon", "2026-11-08", 16);
  assert.equal(deltas.has("2026-11-06"), false);
  assert.equal(deltas.has("2026-11-07"), false);
  assert.equal(deltas.get("2026-11-08"), 6);
});

test("a missing click field stays unknown until a real previous total exists", () => {
  const stored: Record<string, DaySnapshot> = {
    "2026-11-07": { dreams: 1, stories: 0, journal: 0, shared: 0, moon: 10 },
  };
  assert.equal(dailyFromCumulative(stored, "translation", "2026-11-08", 4).size, 0);
  assert.equal(dailyFromCumulative(stored, "earth", "2026-11-08", 4).get("2026-11-08"), 4);
  const next = dailyFromCumulative(
    { ...stored, "2026-11-07": { ...stored["2026-11-07"], translation: 3 } },
    "translation",
    "2026-11-08",
    4,
  );
  assert.equal(next.get("2026-11-08"), 1);
});

test("each row is that day's total in the viewer's timezone", () => {
  const rows = buildMetricSeries({
    todayKey: "2026-11-08",
    tzOffsetMin: -120,
    windowDays: 5,
    events: [
      { ms: Date.parse("2026-11-07T22:30:00Z"), kind: "dreams" },
      { ms: Date.parse("2026-11-06T10:00:00Z"), kind: "stories" },
      { ms: Date.parse("2026-11-08T08:00:00Z"), kind: "comments" },
      { ms: Date.parse("2026-10-01T08:00:00Z"), kind: "shared" },
    ],
    xpEvents: [
      { ms: Date.parse("2026-11-08T08:00:00Z"), xp: 1 },
      { ms: Date.parse("2026-11-08T09:00:00Z"), xp: 0 },
    ],
    storedDays: {
      "2026-11-07": { dreams: 1, stories: 0, journal: 0, shared: 0, moon: 8, earth: 1 },
    },
    currentClicks: { ...clicks, moon: 10, earth: 1, translation: 4 },
    byDay: { translation: { "2026-11-08": 1 }, moon: { "2026-11-08": 99 } },
  });
  const byDate = Object.fromEntries(rows.map((row) => [row.date, row]));
  assert.equal(byDate["2026-11-08"].dreams, 1);
  assert.equal(byDate["2026-11-06"].stories, 1);
  assert.equal(byDate["2026-11-08"].comments, 1);
  assert.equal(byDate["2026-11-08"].xp, 1);
  assert.equal(byDate["2026-11-04"], undefined);
  assert.equal(byDate["2026-11-08"].moon, 2);
  assert.equal(byDate["2026-11-08"].earth, 0);
  assert.equal(byDate["2026-11-08"].translation, 1);
  assert.equal(byDate["2026-11-07"].translation, null);
});

test("quiet history collapses to the last two weeks", () => {
  const rows = buildMetricSeries({
    todayKey: "2026-11-08",
    tzOffsetMin: 0,
    windowDays: 30,
    events: [],
    xpEvents: [],
    storedDays: {},
    currentClicks: clicks,
    byDay: {},
  });
  assert.equal(rows.length, 14);
  assert.equal(rows.at(-1)?.date, "2026-11-08");
  assert.equal(rows[0].moon, null);
  assert.equal(rows[0].dreams, 0);
});
