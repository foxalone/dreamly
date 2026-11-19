import assert from "node:assert/strict";
import test from "node:test";

import {
  adRewardsLeftFor,
  adSaveRewardsLeftToday,
  canAnalyzeDream,
  freeAnalysisDailyLimitReached,
  hasFreeAnalysis,
  hasPaidAccess,
  utcDayKey,
} from "./subscriptions/status";

test("free AI analyses without a subscription: 3 in total", () => {
  assert.equal(hasFreeAnalysis(null), true);
  assert.equal(hasFreeAnalysis({}), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 2 }), true);
  assert.equal(hasFreeAnalysis({ freeAnalysesUsed: 3 }), false);
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
  assert.equal(canAnalyzeDream({ subscriptionStatus: "none", freeAnalysesUsed: 3 }), false);

  assert.equal(hasPaidAccess({ subscriptionStatus: "active" }), true);
  // a subscriber is unaffected by the free counters
  assert.equal(canAnalyzeDream({ subscriptionStatus: "active", freeAnalysesUsed: 5 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 2 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 3 }), false);
  // an expired subscription falls back to the free rule
  assert.equal(canAnalyzeDream({ subscriptionStatus: "expired", freeAnalysesUsed: 0 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "expired", freeAnalysesUsed: 3 }), false);
});

test("rewarded ad credits unlock an analysis", () => {
  assert.equal(canAnalyzeDream({ subscriptionStatus: "none", freeAnalysesUsed: 3, adAnalysisCredits: 1 }), true);
  assert.equal(canAnalyzeDream({ subscriptionStatus: "none", freeAnalysesUsed: 3, adAnalysisCredits: 0 }), false);
});

test("save ads: up to 10 a day", () => {
  const today = utcDayKey();
  assert.equal(adSaveRewardsLeftToday({}), 10);
  assert.equal(adSaveRewardsLeftToday({ adSaveRewardsDayKey: today, adSaveRewardsTodayCount: 10 }), 0);
  assert.equal(adSaveRewardsLeftToday({ adSaveRewardsDayKey: "2000-01-01", adSaveRewardsTodayCount: 10 }), 10);
});

test("ad rewards per paywall kind: analysis unlimited, save 10, translate 3", () => {
  const today = utcDayKey();
  assert.equal(adRewardsLeftFor({ adRewardsDayKey: today, adRewardsTodayCount: 50 }, "analysis"), null);
  assert.equal(adRewardsLeftFor({}, "save"), 10);
  assert.equal(adRewardsLeftFor({}, "translate"), 3);
  assert.equal(adRewardsLeftFor({ adTranslateRewardsDayKey: today, adTranslateRewardsTodayCount: 3 }, "translate"), 0);
  assert.equal(adRewardsLeftFor({ adTranslateRewardsDayKey: today, adTranslateRewardsTodayCount: 3 }, "analysis"), null);
});
