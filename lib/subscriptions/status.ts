import { AD_REWARDS_PER_DAY, AD_SAVE_REWARDS_PER_DAY, AD_TRANSLATE_REWARDS_PER_DAY, DREAMS_PER_DAY, FREE_ANALYSES_PER_DAY, FREE_ANALYSES_TOTAL } from "./plans";

export type SubscriptionStatus =
  | "none"
  | "trial"
  | "active"
  | "cancelled"
  | "expired"
  | "suspended";

export type UserBillingFields = {
  subscriptionStatus?: string;
  subscriptionPlan?: string | null;
  paypalSubscriptionId?: string | null;
  accessUntilMs?: number | null;
  trialEndsAtMs?: number | null;
  dreamsDayKey?: string | null;
  dreamsTodayCount?: number | null;
  /** Free AI analyses without a subscription (3 in total, 1 a day). */
  freeAnalysesUsed?: number | null;
  freeAnalysisDayKey?: string | null;
  freeAnalysesTodayCount?: number | null;
  /** Analyses earned by watching a rewarded ad (spent after the free ones). */
  adAnalysisCredits?: number | null;
  adRewardsDayKey?: string | null;
  adRewardsTodayCount?: number | null;
  /** Diary saves earned by watching a rewarded ad (after the free 5 per network a day). */
  adSaveCredits?: number | null;
  adSaveRewardsDayKey?: string | null;
  adSaveRewardsTodayCount?: number | null;
  /** Legacy banked translation credits; no longer spent. */
  adTranslateCredits?: number | null;
  adTranslateRewardsDayKey?: string | null;
  adTranslateRewardsTodayCount?: number | null;
};

export function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function hasPaidAccess(data: UserBillingFields | null | undefined, now = Date.now()): boolean {
  const status = String(data?.subscriptionStatus ?? "none");
  if (status === "trial" || status === "active") return true;
  if (status === "cancelled") {
    const until = Number(data?.accessUntilMs ?? 0);
    return Number.isFinite(until) && until > now;
  }
  return false;
}

export function dreamsUsedToday(data: UserBillingFields | null | undefined, now = new Date()) {
  const dayKey = utcDayKey(now);
  if (String(data?.dreamsDayKey ?? "") !== dayKey) return 0;
  const used = Number(data?.dreamsTodayCount ?? 0);
  return Number.isFinite(used) ? Math.max(0, Math.floor(used)) : 0;
}

export function remainingDreamsToday(data: UserBillingFields | null | undefined, now = new Date()) {
  return Math.max(0, DREAMS_PER_DAY - dreamsUsedToday(data, now));
}

function count(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** True while a non-subscriber has free AI analyses left (3 in total). */
export function hasFreeAnalysis(data: UserBillingFields | null | undefined) {
  return count(data?.freeAnalysesUsed) < FREE_ANALYSES_TOTAL;
}

/** True when the non-subscriber already took today's free analysis. */
export function freeAnalysisDailyLimitReached(data: UserBillingFields | null | undefined, now = new Date()) {
  if (String(data?.freeAnalysisDayKey ?? "") !== utcDayKey(now)) return false;
  return count(data?.freeAnalysesTodayCount) >= FREE_ANALYSES_PER_DAY;
}

export function adAnalysisCredits(data: UserBillingFields | null | undefined) {
  return count(data?.adAnalysisCredits);
}

/** How many more rewarded ads this non-subscriber may watch today. */
export function adRewardsLeftToday(data: UserBillingFields | null | undefined, now = new Date()) {
  const used = String(data?.adRewardsDayKey ?? "") === utcDayKey(now) ? count(data?.adRewardsTodayCount) : 0;
  return Math.max(0, AD_REWARDS_PER_DAY - used);
}

/** How many more "ad for a save" rewards this non-subscriber may watch today. */
export function adSaveRewardsLeftToday(data: UserBillingFields | null | undefined, now = new Date()) {
  const used = String(data?.adSaveRewardsDayKey ?? "") === utcDayKey(now) ? count(data?.adSaveRewardsTodayCount) : 0;
  return Math.max(0, AD_SAVE_REWARDS_PER_DAY - used);
}

/** Rewarded ads left today for one paywall kind (see lib/paywall.ts). */
export function adRewardsLeftFor(
  data: UserBillingFields | null | undefined,
  kind: "analysis" | "save" | "translate",
  now = new Date()
) {
  if (kind === "save") return adSaveRewardsLeftToday(data, now);
  if (kind === "translate") {
    const used =
      String(data?.adTranslateRewardsDayKey ?? "") === utcDayKey(now) ? count(data?.adTranslateRewardsTodayCount) : 0;
    return Math.max(0, AD_TRANSLATE_REWARDS_PER_DAY - used);
  }
  return adRewardsLeftToday(data, now);
}

/** Can this user get an AI analysis right now (subscriber slot or free one). */
export function canAnalyzeDream(data: UserBillingFields | null | undefined, now = Date.now()) {
  if (hasPaidAccess(data, now)) return remainingDreamsToday(data, new Date(now)) > 0;
  if (hasFreeAnalysis(data) && !freeAnalysisDailyLimitReached(data, new Date(now))) return true;
  return adAnalysisCredits(data) > 0;
}
