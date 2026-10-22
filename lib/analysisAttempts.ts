export const ATTEMPT_EVENTS = ["ad_unavailable", "ad_reward_failed", "auth_unauthorized_domain", "auth_failed", "back", "ad_page_opened", "ad_shown", "ad_signin_available", "ad_reward_confirmed", "auth_opened", "auth_google_started", "auth_email_started", "auth_signup_started", "auth_reset_started", "auth_reset_sent", "auth_succeeded", "auth_cancelled", "auth_popup_blocked", "auth_network_failed", "auth_invalid_credential", "auth_throttled", "auth_disabled"] as const;
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
  if (["ad_page_opened", "ad_shown", "ad_signin_available", "ad_reward_confirmed", "auth_opened", "auth_google_started", "auth_email_started", "auth_signup_started", "auth_reset_started", "auth_reset_sent"].includes(event)) {
    return { status: previous.status || "waiting", reason: previous.reason || "ad_required", lastEvent: event };
  }
  return { status: "incomplete", reason: event === "back" ? previous.reason || "back" : event, lastEvent: event };
}


/** Explicit allowlist: no raw IPs, tokens, cookies, or provider error payloads. */
export function analysisAttemptContext(
  input: { text: string; source?: string; dreamId?: string },
  headers: Headers,
  geo: { cityId: string; city: string; country: string; admin1: string; source: string } | null,
) {
  const sources = ["home_ask", "guest_journal", "dictionary_search", "symbol_inline", "journal"];
  const country = geo?.country || (headers.get("x-vercel-ip-country") ?? "").trim().toUpperCase();
  return {
    cityId: geo?.cityId ?? null, city: geo?.city ?? null,
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    admin1: geo?.admin1 ?? null, citySource: geo ? "ip" : null,
    geoProvider: geo?.source ?? null,
    source: sources.includes(input.source ?? "") ? input.source! : null,
    // IDs are context only; they never grant access to a dream.
    dreamId: typeof input.dreamId === "string" ? input.dreamId.slice(0, 200) : null,
    wordCount: input.text.trim().split(/\s+/u).filter(Boolean).length,
    charCount: input.text.length,
    userAgent: headers.get("user-agent")?.slice(0, 512) ?? null,
  };
}

export function analysisAttemptResult(result: Record<string, unknown>) {
  return {
    analysis: typeof result.analysis === "string" ? result.analysis : null,
    model: typeof result.model === "string" ? result.model : null,
    emojiModel: typeof result.emojiModel === "string" ? result.emojiModel : null,
    emojis: Array.isArray(result.emojis) ? result.emojis.flatMap((e) =>
      e && typeof e.native === "string" ? [{ native: e.native.slice(0, 32) }] : []) : [],
  };
}


export function authAttemptFailure(error: unknown): AttemptEvent {
  const code = (error as { code?: string } | null)?.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "auth_cancelled";
  if (code === "auth/unauthorized-domain") return "auth_unauthorized_domain";
  if (code === "auth/popup-blocked") return "auth_popup_blocked";
  if (code === "auth/network-request-failed") return "auth_network_failed";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/invalid-email", "auth/user-not-found"].includes(code ?? "")) return "auth_invalid_credential";
  if (code === "auth/too-many-requests") return "auth_throttled";
  if (["auth/operation-not-allowed", "auth/user-disabled"].includes(code ?? "")) return "auth_disabled";
  return "auth_failed";
}
