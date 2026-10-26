import assert from "node:assert/strict";
import test from "node:test";
import { analysisDiagnosis, type DiagnosisRow } from "./analysisDiagnosis";
import { analysisProviderFailure, attemptEventDetails, attemptOutcome } from "./analysisAttempts";
import { ANALYSIS_DIAGNOSIS_COPY } from "./i18n/analysisDiagnosis";

const now = 1_000_000;
function row(events: string[], extra: Partial<DiagnosisRow> = {}): DiagnosisRow {
  return { status: "waiting", reason: "ad_required", updatedAtMs: now - 240_000,
    events: events.map(event => ({ event, atMs: now - 240_000 })), ...extra };
}

test("the screenshot's stale overlay is inconclusive, never labelled user abandonment", () => {
  assert.deepEqual(analysisDiagnosis(row(["analysis_retried", "ad_required", "ad_page_opened", "ad_shown"]), now), { code: "ad_unfinished", kind: "unknown" });
  assert.equal(analysisDiagnosis(row([], { updatedAtMs: now }), now).kind, "pending");
  assert.equal(analysisDiagnosis(row([]), now).code, "access_unknown");
  assert.equal(analysisDiagnosis(row(["ad_shown", "ad_page_left"]), now).kind, "unknown");
});

test("known technical failures, limits and confirmed cancellation remain distinct", () => {
  assert.equal(analysisDiagnosis(row(["ad_shown", "ad_grant_timeout"]), now).code, "flow_failed");
  assert.equal(analysisDiagnosis(row([], { status: "failed", reason: "ai_timeout", httpStatus: 500 }), now).code, "server_failed");
  assert.equal(analysisDiagnosis(row([], { status: "blocked", reason: "daily_limit" }), now).kind, "access");
  assert.equal(analysisDiagnosis(row([], { status: "incomplete", reason: "auth_cancelled" }), now).code, "access_incomplete");
  const limited = row(["ad_grant_rejected"]);
  limited.events![0].httpStatus = 429;
  assert.equal(analysisDiagnosis(limited, now).kind, "access");
});

test("recovered ad failure is superseded by access, then confirmed display", () => {
  const attempt = row(["ad_unavailable", "guest_free_access", "ad_resume_started"]);
  assert.equal(analysisDiagnosis(attempt, now).code, "resume_missing");
  attempt.status = "succeeded";
  assert.equal(analysisDiagnosis(attempt, now).code, "display_unknown");
  attempt.events!.push({ event: "analysis_client_failed", atMs: now });
  assert.equal(analysisDiagnosis(attempt, now).code, "delivery_failed");
  attempt.displayedAtMs = now;
  assert.equal(analysisDiagnosis(attempt, now).kind, "delivered");
});

test("a retry isolates old failures; stale server work is a possible outage, not abandonment", () => {
  assert.equal(analysisDiagnosis(row(["ad_grant_timeout", "analysis_retried", "ad_shown"]), now).kind, "unknown");
  const processing = row(["analysis_retried", "guest_free_access"], { status: "processing" });
  assert.equal(analysisDiagnosis(processing, now).code, "server_unfinished");
  assert.equal(analysisDiagnosis({ ...processing, startedAtMs: now }, now).code, "pending");
});

test("access requested again after a confirmed unlock is flagged for investigation", () => {
  const attempt = row(["ad_access_granted", "analysis_retried", "ad_required"]);
  assert.equal(analysisDiagnosis(attempt, now).code, "unlock_rejected");
  // A prior successful reading may legitimately have consumed the credit.
  assert.equal(analysisDiagnosis(row(["ad_access_granted", "analysis_ready", "analysis_retried", "ad_required"]), now).code, "access_unknown");
});

test("diagnostic details allow numeric failure status only; provider errors do not expose payloads", () => {
  assert.deepEqual(attemptEventDetails({ httpStatus: 503, token: "secret", error: "private" }), { httpStatus: 503 });
  for (const value of [null, {}, { httpStatus: "500" }, { httpStatus: 200 }, { httpStatus: 500.5 }, { httpStatus: 999 }]) assert.deepEqual(attemptEventDetails(value), {});
  assert.equal(attemptOutcome(500, analysisProviderFailure({ status: 429, message: "secret" })).reason, "ai_rate_limited");
  assert.equal(attemptOutcome(500, analysisProviderFailure({ name: "APIConnectionTimeoutError" })).reason, "ai_timeout");
  assert.equal(attemptOutcome(500, analysisProviderFailure(new Error("private"))).reason, "ai_unavailable");
});

test("every diagnosis and category has native copy in all six locales", () => {
  for (const copy of Object.values(ANALYSIS_DIAGNOSIS_COPY)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(ANALYSIS_DIAGNOSIS_COPY.en).sort());
    for (const value of Object.values(copy)) assert.ok(value.trim());
  }
});
