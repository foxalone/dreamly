import assert from "node:assert/strict";
import test from "node:test";

import {
  canSaveDream,
  freeAnalysisDailyLimitReached,
  freeDreamDailyLimitReached,
  hasFreeAnalysis,
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

test("free AI analyses: 5 in total, max 1 a day, counted apart from saves", () => {
  const today = utcDayKey();
  assert.equal(hasFreeAnalysis({}), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 4 }), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 5 }), false);
  // used-up saves do not touch the analysis quota
  assert.equal(hasFreeAnalysis({ freeDreamSavesUsed: 5 }), true);
  assert.equal(freeAnalysisDailyLimitReached({ freeAnalysisDayKey: today, freeAnalysesTodayCount: 1 }), true);
  assert.equal(freeAnalysisDailyLimitReached({ freeAnalysisDayKey: "2000-01-01", freeAnalysesTodayCount: 1 }), false);
  // today's free save does not block today's free analysis
  assert.equal(freeAnalysisDailyLimitReached({ freeDreamSaveDayKey: today, freeDreamSavesTodayCount: 1 }), false);
});

test("subscribers: 3 dreams a day", () => {
  const today = utcDayKey();
  assert.equal(canSaveDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 2 }), true);
  assert.equal(canSaveDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 3 }), false);
});
