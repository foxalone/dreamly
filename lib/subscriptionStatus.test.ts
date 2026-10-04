import assert from "node:assert/strict";
import test from "node:test";

import {
  canSaveDream,
  freeDreamDailyLimitReached,
  hasFreeDreamSave,
  hasPaidAccess,
  utcDayKey,
} from "./subscriptions/status";

test("a signed-in user without a subscription gets five free diary saves in total", () => {
  assert.equal(hasFreeDreamSave(null), true);
  assert.equal(hasFreeDreamSave({}), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 0 }), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 4 }), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 5 }), false);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 7 }), false);
  // garbage in the field never unlocks extra saves
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: Number.NaN }), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: -3 }), true);
});

test("free saves: at most one per UTC day", () => {
  const today = utcDayKey();
  assert.equal(freeDreamDailyLimitReached({}), false);
  assert.equal(freeDreamDailyLimitReached({ freeDreamSaveDayKey: today, freeDreamSavesTodayCount: 1 }), true);
  // yesterday's save does not block today
  assert.equal(freeDreamDailyLimitReached({ freeDreamSaveDayKey: "2000-01-01", freeDreamSavesTodayCount: 1 }), false);
});

test("canSaveDream: free saves for non-subscribers, daily slots for subscribers", () => {
  const today = utcDayKey();
  assert.equal(canSaveDream({ subscriptionStatus: "none" }), true);
  assert.equal(canSaveDream({ subscriptionStatus: "none", freeDreamSavesUsed: 2 }), true);
  assert.equal(
    canSaveDream({ subscriptionStatus: "none", freeDreamSavesUsed: 2, freeDreamSaveDayKey: today, freeDreamSavesTodayCount: 1 }),
    false
  );
  assert.equal(canSaveDream({ subscriptionStatus: "none", freeDreamSavesUsed: 5 }), false);

  assert.equal(hasPaidAccess({ subscriptionStatus: "active" }), true);
  // a subscriber is unaffected by the free counters
  assert.equal(
    canSaveDream({ subscriptionStatus: "active", freeDreamSavesUsed: 5, freeDreamSaveDayKey: today, freeDreamSavesTodayCount: 1 }),
    true
  );
  assert.equal(
    canSaveDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 5 }),
    false
  );
  // an expired subscription falls back to the free-save rule
  assert.equal(canSaveDream({ subscriptionStatus: "expired", freeDreamSavesUsed: 0 }), true);
  assert.equal(canSaveDream({ subscriptionStatus: "expired", freeDreamSavesUsed: 5 }), false);
});
