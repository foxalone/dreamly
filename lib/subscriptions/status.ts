import { DREAMS_PER_DAY, FREE_ANALYSES_PER_DAY, FREE_ANALYSES_TOTAL } from "./plans";

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
  /** Free AI analyses without a subscription (5 in total, 1 a day). */
  freeAnalysesUsed?: number | null;
  freeAnalysisDayKey?: string | null;
  freeAnalysesTodayCount?: number | null;
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

/** True while a non-subscriber has free AI analyses left (5 in total). */
export function hasFreeAnalysis(data: UserBillingFields | null | undefined) {
  return count(data?.freeAnalysesUsed) < FREE_ANALYSES_TOTAL;
}

/** True when the non-subscriber already took today's free analysis. */
export function freeAnalysisDailyLimitReached(data: UserBillingFields | null | undefined, now = new Date()) {
  if (String(data?.freeAnalysisDayKey ?? "") !== utcDayKey(now)) return false;
  return count(data?.freeAnalysesTodayCount) >= FREE_ANALYSES_PER_DAY;
}

/** Can this user get an AI analysis right now (subscriber slot or free one). */
export function canAnalyzeDream(data: UserBillingFields | null | undefined, now = Date.now()) {
  if (hasPaidAccess(data, now)) return remainingDreamsToday(data, new Date(now)) > 0;
  return hasFreeAnalysis(data) && !freeAnalysisDailyLimitReached(data, new Date(now));
}
