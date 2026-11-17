import assert from "node:assert/strict";
import test from "node:test";
import { visibleCountdown } from "./visibleCountdown";

test("close becomes available only after five visible seconds", () => {
  const tick = visibleCountdown(5000);
  assert.equal(tick(100, true), 0);
  assert.equal(tick(5099, true), 4999);
  assert.equal(tick(5100, true), 5000);
  assert.equal(tick(9000, true), 5000);
});

test("switching tabs pauses the ad countdown, including its first hidden mount", () => {
  const tick = visibleCountdown(5000);
  assert.equal(tick(0, false), 0);
  assert.equal(tick(10000, true), 0);
  assert.equal(tick(12000, true), 2000);
  assert.equal(tick(12000, false), 2000);
  assert.equal(tick(90000, false), 2000);
  assert.equal(tick(100000, true), 2000);
  assert.equal(tick(102999, true), 4999);
  assert.equal(tick(103000, true), 5000);
});
