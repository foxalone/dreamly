import test from "node:test";
import assert from "node:assert/strict";
import { allowedTaps, distribute, ratePerMin, storageNow, STORAGE_MINUTES } from "./game/economy";

test("rate sums placed buildings", () => {
  assert.equal(ratePerMin([]), 0);
  assert.equal(ratePerMin(["hut"]), 1);
  assert.equal(ratePerMin(["hut", "cottage", "dream-mill"]), 9);
});

test("storage fills per minute and stops at the cap", () => {
  const t0 = 1_000_000;
  assert.deepEqual(storageNow(0, t0, t0 + 3_600_000), { amount: 0, full: false, minutes: 0 });
  assert.equal(storageNow(4, t0, t0 + 30 * 60_000).amount, 120);
  const full = storageNow(4, t0, t0 + 30 * 24 * 3_600_000);
  assert.equal(full.amount, 4 * STORAGE_MINUTES);
  assert.equal(full.full, true);
});

test("allowed taps grow with time but are capped", () => {
  assert.equal(allowedTaps(0), 15);
  assert.equal(allowedTaps(10_000), 165);
  assert.equal(allowedTaps(10 * 60_000), allowedTaps(120_000));
});

test("distribute keeps the total", () => {
  const d = distribute(1234, ["a", "b", "c"]);
  assert.equal(Object.values(d).reduce((x, y) => x + y, 0), 1234);
  assert.deepEqual(distribute(0, ["a"]), {});
});
