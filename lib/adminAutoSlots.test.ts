import assert from "node:assert/strict";
import test from "node:test";

import {
  jerusalemDateKey,
  jerusalemWallTimeToIso,
  nextEmptyPublishDay,
  occupiedSlotKeys,
  publishSlotsForDay,
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
