import { DREAMS_PER_DAY } from "./plans";

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
