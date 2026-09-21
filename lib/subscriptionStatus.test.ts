import assert from "node:assert/strict";
import test from "node:test";

import { canSaveDream, hasFreeDreamSave, hasPaidAccess, utcDayKey } from "./subscriptions/status";

test("a signed-in user without a subscription gets exactly one free diary save", () => {
  assert.equal(hasFreeDreamSave(null), true);
  assert.equal(hasFreeDreamSave({}), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 0 }), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 1 }), false);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: 7 }), false);
  // garbage in the field never unlocks extra saves
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: Number.NaN }), true);
  assert.equal(hasFreeDreamSave({ freeDreamSavesUsed: -3 }), true);
});

test("canSaveDream: free save for non-subscribers, daily slots for subscribers", () => {
  assert.equal(canSaveDream({ subscriptionStatus: "none" }), true);
  assert.equal(canSaveDream({ subscriptionStatus: "none", freeDreamSavesUsed: 1 }), false);

  const today = utcDayKey();
  assert.equal(hasPaidAccess({ subscriptionStatus: "active" }), true);
  // a subscriber who already used the free save is unaffected by that counter
  assert.equal(canSaveDream({ subscriptionStatus: "active", freeDreamSavesUsed: 1 }), true);
  assert.equal(
    canSaveDream({ subscriptionStatus: "active", dreamsDayKey: today, dreamsTodayCount: 5 }),
    false
  );
  // an expired subscription falls back to the free-save rule
  assert.equal(canSaveDream({ subscriptionStatus: "expired", freeDreamSavesUsed: 0 }), true);
  assert.equal(canSaveDream({ subscriptionStatus: "expired", freeDreamSavesUsed: 1 }), false);
});
