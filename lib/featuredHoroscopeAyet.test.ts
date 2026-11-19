import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { playAyetRewarded, type AyetVideoSdk } from "./ayetRewardedVideo";
import {
  AYET_ACCESS_MS, ayetAccessCookie, ayetFallbackDay, bookAyetReward, createAyetAttempt, featuredAyetExpiry,
  featuredAyetSettings, issueAyetAccess, readAyetAttempt, verifyAyetReward,
} from "./featuredHoroscopeAyet";

const publisherKey = "test-publisher-key";
const cookieKey = "test-cookie-key";
const now = 1_800_000_000_000;
const day = "2026-11-19";
const guest = "guest-subject";
const challenge = "11111111-1111-4111-8111-111111111111";

function signedReward(id: string) {
  const conversionId = "abc-video-789";
  return {
    status: "success", rewarded: true, externalIdentifier: id, currency: 10, conversionId,
    signature: createHmac("sha1", publisherKey).update(`${id}10${conversionId}`).digest("hex"),
  };
}

test("ayeT opt-in needs the enable flag, both secrets and the web slot", () => {
  const env = {
    AYET_REWARDED_ENABLED: "true", AYET_WEB_PLACEMENT_ID: "1234", AYET_REWARDED_AD_SLOT: "forecast",
    AYET_PUBLISHER_API_KEY: publisherKey, CRON_SECRET: cookieKey,
  };
  assert.equal(featuredAyetSettings(env)?.placementId, 1234);
  for (const key of Object.keys(env)) assert.equal(featuredAyetSettings({ ...env, [key]: "" }), null);
});

test("only a signed rewarded callback for the current guest attempt can earn access", () => {
  const attempt = createAyetAttempt(day, guest, challenge, cookieKey, now);
  const current = readAyetAttempt(attempt.token, guest, cookieKey, now)!;
  const reward = signedReward(attempt.id);
  assert.equal(verifyAyetReward(reward, current, publisherKey), reward.conversionId);
  assert.equal(verifyAyetReward({ ...reward, currency: 12 }, current, publisherKey), null);
  assert.equal(verifyAyetReward({ ...reward, rewarded: false }, current, publisherKey), null);
  assert.equal(verifyAyetReward(reward, createAyetAttempt(day, guest, challenge, cookieKey, now), publisherKey), null);
  assert.equal(readAyetAttempt(attempt.token, "another-guest", cookieKey, now), null);
  assert.equal(readAyetAttempt(attempt.token, guest, cookieKey, attempt.expiresAtMs), null);
});

test("the guest pass survives a fresh request and expires exactly at two hours", () => {
  const attempt = createAyetAttempt(day, guest, challenge, cookieKey, now);
  const expiresAt = now + AYET_ACCESS_MS;
  const token = issueAyetAccess(attempt, expiresAt, cookieKey);
  const request = (name: string, value: string) => new Request("https://dreamly.art/api/featured-horoscope", {
    headers: { cookie: `${name}=${value}` },
  });
  const cookie = ayetAccessCookie(day);
  assert.equal(featuredAyetExpiry(request(cookie, token), day, guest, now + 1000, cookieKey), expiresAt);
  assert.equal(featuredAyetExpiry(request(cookie, token), day, guest, expiresAt, cookieKey), null);
  assert.equal(featuredAyetExpiry(request(cookie, token), day, "another-guest", now, cookieKey), null);
  assert.equal(featuredAyetExpiry(request(ayetAccessCookie("2026-11-18"), token), "2026-11-18", guest, now, cookieKey), null);
  assert.equal(featuredAyetExpiry(request(cookie, token.replace(/^[^.]/, "!")), day, guest, now, cookieKey), null);
});

test("ayeT can use only the guest's open Google reading challenge and grants it once", async () => {
  const initial = { subject: guest, purpose: "read", day, expiresAtMs: now + 10 * 60_000, used: false };
  let stored = initial;
  const snapshot = async () => ({ data: () => stored });
  const db = {
    collection: () => ({ doc: () => ({ get: snapshot }) }),
    runTransaction: async (work: (tx: object) => Promise<unknown>) => work({
      get: snapshot,
      update: (_: unknown, value: object) => { stored = { ...stored, ...value }; },
    }),
  } as unknown as Firestore;
  await assert.rejects(ayetFallbackDay(db, challenge, "someone-else", now), { message: "INVALID_CHALLENGE" });
  stored = { ...initial, purpose: "translate" };
  await assert.rejects(ayetFallbackDay(db, challenge, guest, now), { message: "INVALID_CHALLENGE" });
  stored = { ...initial, used: true };
  await assert.rejects(ayetFallbackDay(db, challenge, guest, now), { message: "ATTEMPT_USED" });
  const attempt = createAyetAttempt(day, guest, challenge, cookieKey, now);
  await assert.rejects(bookAyetReward(db, attempt, "same", now), { message: "ATTEMPT_USED" });
  stored = initial;
  assert.equal(await ayetFallbackDay(db, challenge, guest, now), day);
  const expiresAtMs = now + AYET_ACCESS_MS;
  assert.deepEqual(await bookAyetReward(db, attempt, "same", now), { expiresAtMs, firstConfirmation: true });
  assert.deepEqual(await bookAyetReward(db, attempt, "same", now + 2000), { expiresAtMs, firstConfirmation: false });
  await assert.rejects(bookAyetReward(db, attempt, "different", now + 2000), { message: "ATTEMPT_USED" });
});

test("the player waits for callbackRewarded, rejects interrupted playback and handles no fill", async () => {
  const config = { placementId: 1234, adSlot: "forecast", attemptId: "attempt" };
  const reward = signedReward(config.attemptId);
  const fixtures: Array<[string, (sdk: AyetVideoSdk) => void]> = [
    ["success", sdk => { sdk.callbackComplete?.(); sdk.callbackRewarded?.(reward); }],
    ["interrupted", sdk => { sdk.callbackPlaying?.(); sdk.callbackError?.(); }],
    ["unavailable", () => assert.fail("No fill must never play")],
  ];
  for (const [mode, play] of fixtures) {
    let closed = false;
    const sdk: AyetVideoSdk = {
      init: async (_placement, identifier) => assert.equal(identifier, config.attemptId),
      requestAd: (_slot, ready, failed) => mode === "unavailable" ? failed() : ready(),
      playFullsizeAd: () => play(sdk),
      destroy: () => { closed = true; },
    };
    const playback = playAyetRewarded(sdk, config, new AbortController().signal, () => {});
    if (mode === "success") assert.equal(await playback, reward);
    else await assert.rejects(playback, { message: mode });
    assert.equal(closed, true);
  }
});
