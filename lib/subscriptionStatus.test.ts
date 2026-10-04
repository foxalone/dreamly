import assert from "node:assert/strict";
import test from "node:test";

import {
  canAnalyzeDream,
  freeAnalysisDailyLimitReached,
  hasFreeAnalysis,
  hasPaidAccess,
  utcDayKey,
} from "./subscriptions/status";

test("free AI analyses without a subscription: 5 in total", () => {
  assert.equal(hasFreeAnalysis(null), true);
  assert.equal(hasFreeAnalysis({}), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 4 }), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 5 }), false);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 7 }), false);
  // garbage in the field never unlocks extra analyses beyond the rule
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: Number.NaN }), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: -3 }), true);
});

test("free AI analyses: at most one per UTC day", () => {
  const today = utcDayKey();
  assert.equal(freeAnalysisDailyLimitReached({}), false);
  assert.equal(freeAnalysisDailyLimitReached({ freeAnalysisDayKey: today, freeAnalysesTodayCount: 1 }), true);
  assert.equal(freeAnalysisDailyLimitReached({ freeAnalysisDayKey: "2000-01-01", freeAnalysesTodayCount: 1 }), false);
});

test("canAnalyzeDream: free rule for non-subscribers, 3 a day for subscribers", () => {
  const today = utcDayKey();
  assert.equal(canAnalyzeDream({ subscriptionStatus: "none" }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "none", freeAnalysesUsed: 2 }), true);
  assert.equal(
    canAnalyzeDream({ subscriptionStatus: "none", freeAnalysesUsed: 2, freeAnalysisDayKey: today, freeAnalysesTodayCount: 1 }),
    false
  );
  assert.equal(canAnalyzeDream({ subscriptionStatus: "none", freeAnalysesUsed: 5 }), false);

  assert.equal(hasPaidAccess({ subscriptionStatus: "active" }), true);
  // a subscriber is unaffected by the free counters
  assert.equal(canAnalyzeDream({ subscriptionStatus: "active", freeAnalysesUsed: 5 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 2 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 3 }), false);
  // an expired subscription falls back to the free rule
  assert.equal(canAnalyzeDream({ subscriptionStatus: "expired", freeAnalysesUsed: 0 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "expired", freeAnalysesUsed: 5 }), false);
});
