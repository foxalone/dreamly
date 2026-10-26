export type DiagnosisRow = {
  status: string; reason: string; updatedAtMs: number; displayedAtMs?: number | null;
  httpStatus?: number; startedAtMs?: number;
  events?: { event: string; atMs: number; source?: string; httpStatus?: number }[];
};

/** Receipt order is authoritative. Only diagnose the latest analysis request. */
export function analysisDiagnosis(row: DiagnosisRow, now = Date.now()) {
  const all = row.events ?? [];
  const start = all.findLastIndex(e => e.event === "analysis_submitted" || e.event === "analysis_retried");
  const events = all.slice(Math.max(0, start));
  const last = (...names: string[]) => events.findLastIndex(e => names.includes(e.event));
  const age = now - (events.at(-1)?.atMs ?? row.updatedAtMs);
  const result = (code: string, kind: "service" | "access" | "unknown" | "pending" | "delivered", evidence?: { event: string; httpStatus?: number }) => ({ code, kind, ...(evidence ? { evidence } : {}) });
  if (row.displayedAtMs || last("analysis_displayed") >= 0) return result("delivered", "delivered");
  if (last("analysis_client_failed") > last("analysis_ready")) return result("delivery_failed", "service");
  if (row.status === "succeeded") return result(age > 60_000 ? "display_unknown" : "pending", age > 60_000 ? "unknown" : "pending");
  if (row.status === "failed" || (row.httpStatus ?? 0) >= 500) return result("server_failed", "service", { event: row.reason, httpStatus: row.httpStatus });
  const previous = all.slice(0, Math.max(0, start));
  if (["ad_required", "network_free_limit", "guest_free_limit"].includes(row.reason) && previous.findLastIndex(e => ["ad_access_granted", "ad_reward_confirmed", "auth_succeeded"].includes(e.event)) > previous.findLastIndex(e => e.event === "analysis_ready")) {
    return result("unlock_rejected", "service");
  }
  const grant = last("ad_access_granted", "ad_reward_confirmed", "auth_succeeded", "guest_free_access");
  const failure = last("ad_grant_rejected", "ad_grant_network_failed", "ad_grant_timeout", "ad_auth_timeout", "ad_reward_failed", "auth_unauthorized_domain", "auth_disabled", "auth_network_failed", "auth_popup_blocked", "auth_failed", "ad_unavailable");
  if (failure > grant) return events[failure]?.httpStatus === 429
    ? result("access_blocked", "access", events[failure]) : result("flow_failed", "service", events[failure]);
  if (["ad_unavailable", "ad_reward_failed", "auth_unauthorized_domain", "auth_disabled", "auth_network_failed", "auth_popup_blocked", "auth_failed", "ad_grant_rejected", "ad_grant_timeout", "ad_grant_network_failed", "ad_auth_timeout"].includes(row.reason) && grant < 0) return result("flow_failed", "service", { event: row.reason });
  if (grant < 0 && ["network_free_limit", "guest_free_limit"].includes(row.reason)) return result(row.reason, "access");
  if (["daily_limit", "credits_required"].includes(row.reason)) return result("access_blocked", "access");
  if (["auth_cancelled", "auth_invalid_credential", "auth_throttled", "access_choice_dismissed"].includes(row.reason)) return result("access_incomplete", "access");
  if (row.status === "processing") {
    const elapsed = now - (row.startedAtMs ?? events[0]?.atMs ?? row.updatedAtMs);
    return result(elapsed > 120_000 ? "server_unfinished" : "pending", elapsed > 120_000 ? "unknown" : "pending");
  }
  if (grant >= 0) return result(age > 60_000 ? "resume_missing" : "pending", age > 60_000 ? "service" : "pending");
  if (last("ad_shown") >= 0) return result(age > 180_000 || last("ad_stalled", "ad_page_left") >= 0 ? "ad_unfinished" : "pending", age > 180_000 || last("ad_stalled", "ad_page_left") >= 0 ? "unknown" : "pending");
  return result(age > 180_000 ? "access_unknown" : "pending", age > 180_000 ? "unknown" : "pending");
}
