import test from "node:test";
import assert from "node:assert/strict";
import { allowedTaps, buildingStorage, distribute, nextCost, ratePerMin, storageNow, STORAGE_MINUTES } from "./game/economy";

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

test("each building has its own storage", () => {
  const t0 = 1_000_000;
  const s = buildingStorage(["hut", "cottage"], { hut: t0, cottage: t0 + 30 * 60_000 }, null, t0 + 60 * 60_000);
  assert.equal(s.by.hut.amount, 60);
  assert.equal(s.by.cottage.amount, 90);
  assert.equal(s.total, 150);
  assert.equal(buildingStorage(["hut"], undefined, t0, t0 + 10 * 60_000).by.hut.amount, 10);
});

test("copies: price grows 15% per copy, income adds up", () => {
  assert.equal(nextCost(15, 0), 15);
  assert.equal(nextCost(15, 1), 17);
  assert.equal(nextCost(200, 2), 264);
  assert.equal(ratePerMin(["hut", "cottage"], { hut: 3, cottage: 2 }), 3 + 6);
  const t0 = 1_000_000;
  assert.equal(buildingStorage(["hut"], { hut: t0 }, null, t0 + 10 * 60_000, { hut: 4 }).by.hut.amount, 40);
});
