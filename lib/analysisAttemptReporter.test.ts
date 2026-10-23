import assert from "node:assert/strict";
import test from "node:test";
import { analysisAttemptReporter, reportAnalysisAttempt } from "./reportAnalysisAttempt";

test("sign-in reporting keeps the captured attempt after import removes local data", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const attemptId = "a".repeat(64);
  let stored: string | null = JSON.stringify([{ text: "private dream", analysisAttemptId: attemptId, resumeAnalysis: true }]);
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: { getItem: () => stored },
  } });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
    t.mock.restoreAll();
  });
  const bodies: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url, "/api/dreams/attempt-event");
    assert.equal(init?.keepalive, true);
    assert.equal(init?.credentials, "same-origin");
    bodies.push(JSON.parse(String(init?.body)));
    return new Response("{}", { status: 200 });
  });
  const report = analysisAttemptReporter();
  report("auth_opened");
  stored = null;
  report("auth_succeeded");
  analysisAttemptReporter()("auth_opened"); // No pending attempt: no report.
  assert.deepEqual(bodies, [
    { attemptId, event: "auth_opened" }, { attemptId, event: "auth_succeeded" },
  ]);
  assert.ok(!JSON.stringify(bodies).includes("private dream"));
});

test("signed-in display reporting authenticates without relying on pending local data", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { attemptId: "b".repeat(64), event: "analysis_displayed", idToken: "verified-token" });
    return new Response("{}");
  });
  reportAnalysisAttempt("analysis_displayed", undefined, "b".repeat(64), "verified-token");
});
