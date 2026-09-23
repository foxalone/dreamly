import assert from "node:assert/strict";
import test from "node:test";

import {
  jerusalemDateKey,
  jerusalemWallTimeToIso,
  nextEmptyPublishDay,
  nextEmptyPublishDays,
  nextFreePublishSlots,
  imagePublishAtForSlot,
  occupiedSlotKeys,
  publishSlotsForDay,
  publishSlotsForDays,
} from "./adminAutoSlots";

test("converts 13 Sep 2026 Jerusalem slots to UTC", () => {
  assert.equal(jerusalemWallTimeToIso("2026-09-13", 5), "2026-09-13T02:00:00.000Z");
  assert.equal(jerusalemWallTimeToIso("2026-09-13", 15), "2026-09-13T12:00:00.000Z");
  assert.equal(jerusalemDateKey("2026-09-13T02:00:00.000Z"), "2026-09-13");
});

test("picks the next fully free day after occupied 05:00/15:00 slots", () => {
  const occupied = occupiedSlotKeys([
    "2026-09-09T02:00:00.000Z",
    "2026-09-09T12:00:00.000Z",
    "2026-09-10T02:00:00.000Z",
    "2026-09-11T02:00:00.000Z",
    "2026-09-11T12:00:00.000Z",
    "2026-09-12T02:00:00.000Z",
    "2026-09-12T12:00:00.000Z",
  ]);
  const day = nextEmptyPublishDay(occupied, new Date("2026-09-09T05:12:00.000Z"));
  assert.equal(day, "2026-09-13");
  assert.deepEqual(
    publishSlotsForDay(day).map((slot) => slot.publishAt),
    ["2026-09-13T02:00:00.000Z", "2026-09-13T12:00:00.000Z"],
  );
});

test("keeps a two-day horizon with four 05:00/15:00 slots", () => {
  const occupied = occupiedSlotKeys([
    "2026-09-10T02:00:00.000Z",
    "2026-09-12T02:00:00.000Z",
    "2026-09-12T12:00:00.000Z",
  ]);
  // 09-09 has already lost its 05:00 slot and 09-10 has one slot booked, so the
  // horizon takes the earliest days where BOTH slots are still free - gaps
  // before the last booked day included.
  const days = nextEmptyPublishDays(occupied, 2, new Date("2026-09-09T05:12:00.000Z"));
  assert.deepEqual(days, ["2026-09-11", "2026-09-13"]);
  assert.equal(publishSlotsForDays(days).length, 4);
});

test("refills the holes left by failed pairs before opening a new day", () => {
  const occupied = occupiedSlotKeys([
    "2026-10-08T02:00:00.000Z", // 08.10 05:00 booked, 15:00 free
    "2026-10-09T12:00:00.000Z", // 09.10 15:00 booked, 05:00 free
  ]);
  const slots = nextFreePublishSlots(occupied, 3, new Date("2026-09-23T10:00:00.000Z"));
  assert.deepEqual(
    slots.map((slot) => `${slot.dateKey}|${slot.hour}`),
    ["2026-09-23|15", "2026-09-24|5", "2026-09-24|15"],
  );
  const fullDays = [
    ...Array.from({ length: 8 }, (_, i) => `2026-09-${23 + i}`),
    ...Array.from({ length: 7 }, (_, i) => `2026-10-0${1 + i}`),
  ].flatMap((day) => [`${day}T02:00:00.000Z`, `${day}T12:00:00.000Z`]);
  const later = nextFreePublishSlots(
    occupiedSlotKeys([...fullDays, "2026-10-08T02:00:00.000Z", "2026-10-09T12:00:00.000Z"]),
    2,
    new Date("2026-09-23T10:00:00.000Z"),
  );
  assert.deepEqual(later.map((slot) => `${slot.dateKey}|${slot.hour}`), ["2026-10-08|15", "2026-10-09|5"]);
});

test("images follow their video five hours later and never block a video slot", () => {
  assert.equal(imagePublishAtForSlot("2026-10-08T02:00:00.000Z"), "2026-10-08T07:00:00.000Z");
  assert.equal(imagePublishAtForSlot("2026-10-08T12:00:00.000Z"), "2026-10-08T17:00:00.000Z");
  assert.equal(imagePublishAtForSlot("nope"), "");
});
