import assert from "node:assert/strict";
import test from "node:test";
import { attemptOutcome, clientAttemptUpdate, isAttemptEvent, ownsAnalysisAttempt } from "./analysisAttempts";
import { ANALYSIS_ATTEMPT_COPY } from "./i18n/analysisAttempts";

test("quota gates are waiting or blocked, AI errors fail, and successful retries complete", () => {
  assert.deepEqual(attemptOutcome(401, "GUEST_LIMIT_REACHED"), { status: "waiting", reason: "ad_required" });
  assert.equal(attemptOutcome(429, "FREE_DAILY_LIMIT").reason, "daily_limit");
  assert.equal(attemptOutcome(402, "INSUFFICIENT_CREDITS").reason, "credits_required");
  assert.equal(attemptOutcome(500, "API_KEY_MISSING").reason, "configuration_error");
  assert.equal(attemptOutcome(500, "EMPTY_ANALYSIS").reason, "empty_analysis");
  assert.equal(attemptOutcome(500).reason, "analysis_error");
  assert.equal(attemptOutcome(200).status, "succeeded");
});

test("late browser failures cannot overwrite success and Back preserves the actual known failure", () => {
  for (const event of ["ad_unavailable", "auth_failed", "ad_reward_failed", "back"] as const) {
    assert.equal(clientAttemptUpdate({ status: "succeeded" }, event), null);
  }
  const failed = clientAttemptUpdate({ status: "waiting", reason: "ad_required" }, "auth_unauthorized_domain")!;
  assert.equal(failed.reason, "auth_unauthorized_domain");
  assert.equal(clientAttemptUpdate(failed, "back")!.reason, "auth_unauthorized_domain");
});

test("attempt events require the owning account or guest cookie, never null identities", () => {
  const row = { uid: "user-1", guestId: "guest-1" };
  assert.equal(ownsAnalysisAttempt(row, "user-1", null), true);
  assert.equal(ownsAnalysisAttempt(row, null, "guest-1"), true);
  assert.equal(ownsAnalysisAttempt(row, "other-user", "other-guest"), false);
  assert.equal(ownsAnalysisAttempt({ uid: null, guestId: null }, null, null), false);
  assert.equal(isAttemptEvent("succeeded"), false);
  assert.equal(isAttemptEvent("ad_unavailable"), true);
  assert.equal(isAttemptEvent({ event: "auth_failed" }), false);
});

test("all six locales describe every recorded reason and have the same controls", () => {
  const en = ANALYSIS_ATTEMPT_COPY.en;
  for (const copy of Object.values(ANALYSIS_ATTEMPT_COPY)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(en).sort());
    assert.deepEqual(Object.keys(copy.reasons).sort(), Object.keys(en.reasons).sort());
    for (const text of Object.values(copy.reasons)) assert.ok(text.trim());
  }
});
