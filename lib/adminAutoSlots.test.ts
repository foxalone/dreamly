import assert from "node:assert/strict";
import test from "node:test";

import {
  imagePublishAtForSlot,
  nextEmptyPublishDay,
  nextEmptyPublishDays,
  nextFreePublishSlots,
  occupiedSlotKeys,
  planOnePerDay,
  publishSlotsForDay,
  publishSlotsForDays,
  slotDateKey,
  slotWallTimeToIso,
  startOfTomorrowInJerusalem,
} from "./adminAutoSlots";

test("12:00 New York is 16:00 UTC in summer time and 17:00 UTC in winter time", () => {
  assert.equal(slotWallTimeToIso("2026-09-29", 12), "2026-09-29T16:00:00.000Z");
  assert.equal(slotWallTimeToIso("2026-11-02", 12), "2026-11-02T17:00:00.000Z");
  assert.equal(slotDateKey("2026-09-29T16:00:00.000Z"), "2026-09-29");
  // 23:30 ET on the 29th is already the 30th in UTC but still the 29th in New York.
  assert.equal(slotDateKey("2026-09-30T03:30:00.000Z"), "2026-09-29");
});

test("one video slot a day", () => {
  assert.deepEqual(
    publishSlotsForDay("2026-09-29").map((slot) => slot.publishAt),
    ["2026-09-29T16:00:00.000Z"],
  );
});

test("picks the next free day after booked 12:00 slots", () => {
  const occupied = occupiedSlotKeys([
    "2026-09-29T16:00:00.000Z",
    "2026-09-30T16:00:00.000Z",
    "2026-10-02T16:00:00.000Z",
  ]);
  const now = new Date("2026-09-29T10:00:00.000Z");
  assert.equal(nextEmptyPublishDay(occupied, now), "2026-10-01");
  const days = nextEmptyPublishDays(occupied, 2, now);
  assert.deepEqual(days, ["2026-10-01", "2026-10-03"]);
  assert.equal(publishSlotsForDays(days).length, 2);
});

test("an off-grid booking (old 05:00/15:00 Jerusalem) takes the whole New York day", () => {
  // 15:00 Jerusalem on 28 Sep = 08:00 ET on 28 Sep.
  const occupied = occupiedSlotKeys(["2026-09-28T12:00:00.000Z"]);
  assert.equal(nextEmptyPublishDay(occupied, new Date("2026-09-28T05:00:00.000Z")), "2026-09-29");
});

test("today's slot is skipped once it is less than a minute away", () => {
  const slots = nextFreePublishSlots(new Set(), 2, new Date("2026-09-29T16:30:00.000Z"));
  assert.deepEqual(slots.map((slot) => slot.dateKey), ["2026-09-30", "2026-10-01"]);
});

test("images go out the same New York day at 19:00", () => {
  assert.equal(imagePublishAtForSlot("2026-09-29T16:00:00.000Z"), "2026-09-29T23:00:00.000Z");
  assert.equal(imagePublishAtForSlot("2026-11-02T17:00:00.000Z"), "2026-11-03T00:00:00.000Z");
  // A video booked after 19:00 ET keeps a seven-hour gap.
  assert.equal(imagePublishAtForSlot("2026-09-30T00:00:00.000Z"), "2026-09-30T07:00:00.000Z");
  assert.equal(imagePublishAtForSlot("nope"), "");
});

test("'from tomorrow' is midnight Jerusalem", () => {
  assert.equal(startOfTomorrowInJerusalem(new Date("2026-09-28T09:00:00.000Z")).toISOString(), "2026-09-28T21:00:00.000Z");
  // Israel is back on winter time from 25 Oct.
  assert.equal(startOfTomorrowInJerusalem(new Date("2026-10-26T09:00:00.000Z")).toISOString(), "2026-10-26T22:00:00.000Z");
});

test("respaces two-a-day bookings to one a day from tomorrow, keeping their order", () => {
  const cutoff = new Date("2026-09-28T21:00:00.000Z");
  const moves = planOnePerDay(
    [
      { id: "b", at: "2026-09-29T12:00:00.000Z" }, // 29 Sep 15:00 Jerusalem
      { id: "a", at: "2026-09-29T02:00:00.000Z" }, // 29 Sep 05:00 Jerusalem
      { id: "c", at: "2026-09-30T02:00:00.000Z" },
    ],
    cutoff,
  );
  assert.deepEqual(
    moves.map((move) => [move.id, move.publishAt, move.imagePublishAt]),
    [
      ["a", "2026-09-29T16:00:00.000Z", "2026-09-29T23:00:00.000Z"],
      ["b", "2026-09-30T16:00:00.000Z", "2026-09-30T23:00:00.000Z"],
      ["c", "2026-10-01T16:00:00.000Z", "2026-10-01T23:00:00.000Z"],
    ],
  );
  const again = planOnePerDay(moves.map((move) => ({ id: move.id, at: move.publishAt })), cutoff);
  assert.ok(again.every((move) => !move.changed));
});
