import assert from "node:assert/strict";
import test from "node:test";
import { dreamImageState, matchesAndroidImageAttempt, matchesWebImageAttempt, validImageId } from "./dreamImage";

test("a generated dream image stays locked until its reward is confirmed", () => {
  assert.equal(dreamImageState({ state: "working", leaseUntil: 2000 }, 1000), "awaiting-ad");
  assert.equal(dreamImageState({ state: "saved" }, 1000), "new");
  assert.equal(dreamImageState({ state: "saved", confirmationUntil: 2000 }, 1000), "awaiting-confirmation");
  assert.equal(dreamImageState({ state: "saved", rewarded: true }, 1000), "ready");
});

test("confirmed users can retry expired or failed generation without repeating the ad", () => {
  assert.equal(dreamImageState({ state: "working", rewarded: true, leaseUntil: 1000 }, 1000), "failed");
  assert.equal(dreamImageState({ state: "failed", rewarded: true }, 1000), "failed");
  assert.equal(dreamImageState({ state: "working", rewarded: true, leaseUntil: 2000 }, 1000), "working");
  assert.equal(dreamImageState({ rewarded: true, rewardedAt: 1000 }, 5999), "working");
  assert.equal(dreamImageState({ rewarded: true, rewardedAt: 1000 }, 6000), "failed");
});

test("image identifiers cannot select another collection", () => {
  assert.equal(validImageId("android_guest_123"), true);
  assert.equal(validImageId("outside/another-user"), false);
  assert.equal(validImageId(""), false);
});

test("a reported web reward belongs to its original account, dream, and placement", () => {
  const path = "/123/dream_image";
  const attempt = {
    uid: "owner", dreamId: "dream", platform: "web" as const,
    unit: path, issuedAt: 1000, expiresAt: 2000,
  };
  assert.equal(matchesWebImageAttempt(attempt, "owner", "dream", path, 1500), true);
  assert.equal(matchesWebImageAttempt(attempt, "owner", "dream", path, 1500, "feed"), false);
  assert.equal(matchesWebImageAttempt({ ...attempt, scope: "feed" }, "owner", "dream", path, 1500), false);
  assert.equal(matchesWebImageAttempt(attempt, "other", "dream", path, 1500), false);
  assert.equal(matchesWebImageAttempt(attempt, "owner", "other", path, 1500), false);
  assert.equal(matchesWebImageAttempt(attempt, "owner", "dream", "/123/other", 1500), false);
  assert.equal(matchesWebImageAttempt(attempt, "owner", "dream", path, 2000), false);
  assert.equal(matchesWebImageAttempt({ ...attempt, platform: "android" }, "owner", "dream", path, 1500), false);
});

test("Android image attempts stay bound to the account, dream and scope that requested the ad", () => {
  const journal = { uid: "owner", dreamId: "dream", platform: "android" as const, issuedAt: 1000, expiresAt: 2000 };
  const feed = { ...journal, scope: "feed" as const };
  assert.equal(matchesAndroidImageAttempt(journal, "owner", "dream", 1500, "journal"), true);
  assert.equal(matchesAndroidImageAttempt(journal, "owner", "dream", 1500, "feed"), false);
  assert.equal(matchesAndroidImageAttempt(feed, "owner", "dream", 1500, "feed"), true);
  assert.equal(matchesAndroidImageAttempt(feed, "owner", "dream", 1500, "journal"), false);
  assert.equal(matchesAndroidImageAttempt(feed, "other", "dream", 1500, "feed"), false);
  assert.equal(matchesAndroidImageAttempt(feed, "owner", "other", 1500, "feed"), false);
  assert.equal(matchesAndroidImageAttempt(feed, "owner", "dream", 999, "feed"), false);
  assert.equal(matchesAndroidImageAttempt(feed, "owner", "dream", 2000, "feed"), false);
  assert.equal(matchesAndroidImageAttempt({ ...feed, platform: "web" }, "owner", "dream", 1500, "feed"), false);
});
