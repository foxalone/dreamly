import assert from "node:assert/strict";
import test from "node:test";
import { AdminPollingError, AdminPollingGate, startAdminPolling } from "./adminPolling";

test("manual and automatic refresh cannot overlap; manual refresh recovers from a permanent error", () => {
  const gate = new AdminPollingGate();
  assert.equal(gate.begin(true, 0), true);
  assert.equal(gate.begin(false, 0), false);
  gate.failure(new AdminPollingError(403, "Forbidden"), 0);
  gate.finish();
  assert.equal(gate.begin(true, 100_000), false);
  assert.equal(gate.begin(false, 100_000), true);
  gate.success();
  gate.finish();
  assert.equal(gate.begin(true, 100_000), true);
});

test("network errors back off and stop after three failures, even after returning to a tab", () => {
  const gate = new AdminPollingGate();
  assert.equal(gate.begin(true, 0), true);
  gate.failure(new TypeError("Failed to fetch"), 0); gate.finish();
  assert.equal(gate.begin(true, 9_999), false);
  assert.equal(gate.begin(true, 10_000), true);
  gate.failure(new TypeError("Failed to fetch"), 10_000); gate.finish();
  assert.equal(gate.begin(true, 29_999), false);
  assert.equal(gate.begin(true, 30_000), true);
  gate.failure(new TypeError("Failed to fetch"), 30_000); gate.finish();
  assert.equal(gate.begin(true, 3_600_000), false);
});

test("429 retries with delay; successful recovery resets the failure budget", () => {
  const gate = new AdminPollingGate();
  gate.begin(true, 0); gate.failure(new AdminPollingError(429, "Rate limited"), 0); gate.finish();
  assert.equal(gate.begin(true, 10_000), true);
  gate.success(); gate.finish();
  assert.equal(gate.begin(true, 10_001), true);
});

test("active polling pauses while hidden, resumes once, waits for a slow request, and stops on completion", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  t.after(() => { if (original) Object.defineProperty(globalThis, "document", original); else Reflect.deleteProperty(globalThis, "document"); });
  let requests = 0;
  let resolve: () => void = () => {};
  const stop = startAdminPolling(() => {
    requests++;
    return new Promise<void>((done) => { resolve = done; });
  }, 5000);
  t.after(stop);
  t.mock.timers.tick(5000);
  assert.equal(requests, 1);
  t.mock.timers.tick(30_000);
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(requests, 1, "a slow request must not overlap a timer or focus refresh");
  doc.visibilityState = "hidden";
  doc.dispatchEvent(new Event("visibilitychange"));
  resolve(); await Promise.resolve();
  t.mock.timers.tick(60_000);
  assert.equal(requests, 1);
  doc.visibilityState = "visible";
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(requests, 2, "returning to the tab immediately refreshes active work");
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(requests, 2);
  stop(); // React cleanup when the job becomes completed/failed, or the panel unmounts.
  resolve(); await Promise.resolve();
  t.mock.timers.tick(60_000);
  assert.equal(requests, 2, "completion must not reschedule a pending request");
});

test("essential catch-up scheduling continues in a hidden tab", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requests = 0;
  const stop = startAdminPolling(async () => { requests++; }, 8000, false);
  t.after(stop);
  t.mock.timers.tick(8000); await Promise.resolve();
  t.mock.timers.tick(8000); await Promise.resolve();
  assert.equal(requests, 2);
});
