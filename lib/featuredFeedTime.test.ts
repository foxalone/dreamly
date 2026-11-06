import assert from "node:assert/strict";
import test from "node:test";
import { featuredFeedSlot } from "./featuredFeedTime";

function inZone(zone: string, run: () => void) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try { run(); }
  finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

test("the feed releases the visitor's date at 06:00, including extreme UTC offsets", () => {
  for (const [zone, before, at, day] of [
    ["Asia/Jerusalem", "2026-11-06T03:59:59Z", "2026-11-06T04:00:00Z", "2026-11-06"],
    ["Pacific/Kiritimati", "2026-11-05T15:59:59Z", "2026-11-05T16:00:00Z", "2026-11-06"],
    ["Etc/GMT+12", "2026-11-06T17:59:59Z", "2026-11-06T18:00:00Z", "2026-11-06"],
  ]) {
    inZone(zone, () => {
      const early = featuredFeedSlot(new Date(before));
      const released = featuredFeedSlot(new Date(at));
      assert.equal(early.day, "2026-11-05");
      assert.equal(early.nextRefreshMs, Date.parse(at));
      assert.equal(released.day, day);
      assert.equal(released.publishedAtMs, Date.parse(at));
      if (zone === "Asia/Jerusalem") {
        assert.ok(released.publishedAtMs > Date.parse("2026-11-05T17:14:00Z"));
      }
    });
  }
});

test("next refresh remains at 06:00 local across daylight saving time", () => {
  inZone("America/New_York", () => {
    const released = featuredFeedSlot(new Date("2026-10-31T10:00:00Z"));
    assert.equal(released.day, "2026-10-31");
    assert.equal(released.nextRefreshMs, Date.parse("2026-11-01T11:00:00Z"));
  });
});

test("before 06:00 the previous forecast remains current across a year boundary", () => {
  inZone("UTC", () => {
    const slot = featuredFeedSlot(new Date("2027-01-01T05:59:00Z"));
    assert.equal(slot.day, "2026-12-31");
    assert.equal(slot.publishedAtMs, Date.parse("2026-12-31T06:00:00Z"));
    assert.equal(slot.nextRefreshMs, Date.parse("2027-01-01T06:00:00Z"));
  });
});
