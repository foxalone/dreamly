export const ATTEMPT_EVENTS = ["ad_unavailable", "ad_reward_failed", "auth_unauthorized_domain", "auth_failed", "back"] as const;
export type AttemptEvent = typeof ATTEMPT_EVENTS[number];
export function ownsAnalysisAttempt(row: { uid?: string | null; guestId?: string | null }, uid: string | null, guestId: string | null): boolean {
  return Boolean((uid && row.uid === uid) || (guestId && row.guestId === guestId));
}
export function isAttemptEvent(value: unknown): value is AttemptEvent {
  return typeof value === "string" && ATTEMPT_EVENTS.includes(value as AttemptEvent);
}
export function attemptOutcome(status: number, code?: string) {
  if (status < 400) return { status: "succeeded", reason: "succeeded" };
  if (code === "GUEST_LIMIT_REACHED") return { status: "waiting", reason: "ad_required" };
  if (["FREE_DAILY_LIMIT", "DAILY_LIMIT"].includes(code ?? "")) return { status: "blocked", reason: "daily_limit" };
  if (["SUBSCRIPTION_REQUIRED", "INSUFFICIENT_CREDITS"].includes(code ?? "")) return { status: "blocked", reason: "credits_required" };
  return { status: "failed", reason: code === "API_KEY_MISSING" ? "configuration_error" : code === "EMPTY_ANALYSIS" ? "empty_analysis" : "analysis_error" };
}
/** Never downgrade a completed reading with a late browser event. Keep the actual failure on Back. */
export function clientAttemptUpdate(previous: { status?: string; reason?: string }, event: AttemptEvent) {
  if (previous.status === "succeeded") return null;
  return { status: "incomplete", reason: event === "back" ? previous.reason || "back" : event, lastEvent: event };
}
