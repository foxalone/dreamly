import assert from "node:assert/strict";
import test from "node:test";
import { canReadTarotAccess, canReadTarotUnlock, issueTarotAccess, issueTarotUnlock } from "./access";

const secret = "local-test-secret";
const day = "2026-11-05";
const now = new Date("2026-11-05T12:00:00Z");

test("a draw URL requires the original browser cookie and signed receipt", () => {
  const receipt = issueTarotAccess("browser-a", day, "priestess", secret);
  assert.equal(canReadTarotAccess(receipt, "browser-a", day, "priestess", secret, now), true);
  assert.equal(canReadTarotAccess(receipt, null, day, "priestess", secret, now), false);
  assert.equal(canReadTarotAccess(receipt, "browser-b", day, "priestess", secret, now), false);
  assert.equal(canReadTarotAccess(receipt, "browser-a", day, "fool", secret, now), false);
  assert.equal(canReadTarotAccess(receipt, "browser-a", day, "priestess", secret, new Date("2026-11-06T00:00:00Z")), false);
  assert.equal(canReadTarotAccess(`${receipt.slice(0, -1)}x`, "browser-a", day, "priestess", secret, now), false);
});

test("a draw receipt cannot open the reading until a separate daily unlock is issued", () => {
  const draw = issueTarotAccess("browser-a", day, "priestess", secret);
  const unlock = issueTarotUnlock("browser-a", day, "priestess", secret);
  assert.equal(canReadTarotUnlock(draw, "browser-a", day, "priestess", secret, now), false);
  assert.equal(canReadTarotUnlock(unlock, "browser-a", day, "priestess", secret, now), true);
  assert.equal(canReadTarotUnlock(unlock, "browser-b", day, "priestess", secret, now), false);
  assert.equal(canReadTarotUnlock(unlock, "browser-a", day, "fool", secret, now), false);
  assert.equal(canReadTarotUnlock(unlock, "browser-a", day, "priestess", secret, new Date("2026-11-06T00:00:00Z")), false);
});
