import assert from "node:assert/strict";
import test from "node:test";

import {
  BUFFER_TIKTOK_DAILY_POST_LIMIT,
  bufferRateLimitMessage,
  bufferTikTokReadiness,
  tiktokBufferQuota,
  tiktokBufferQuotaRemainingLabel,
} from "./adminTikTok";

function withBufferEnv(values: { apiKey?: string; username?: string }, run: () => void) {
  const previousKey = process.env.BUFFER_API_KEY;
  const previousUsername = process.env.BUFFER_TIKTOK_USERNAME;
  try {
    if (values.apiKey === undefined) delete process.env.BUFFER_API_KEY;
    else process.env.BUFFER_API_KEY = values.apiKey;
    if (values.username === undefined) delete process.env.BUFFER_TIKTOK_USERNAME;
    else process.env.BUFFER_TIKTOK_USERNAME = values.username;
    run();
  } finally {
    if (previousKey === undefined) delete process.env.BUFFER_API_KEY;
    else process.env.BUFFER_API_KEY = previousKey;
    if (previousUsername === undefined) delete process.env.BUFFER_TIKTOK_USERNAME;
    else process.env.BUFFER_TIKTOK_USERNAME = previousUsername;
  }
}

test("TikTok readiness from env does not call fetch", () => {
  withBufferEnv({ apiKey: "test-key", username: "dreamly_art" }, () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error("fetch must not run for TikTok status");
    }) as typeof fetch;
    try {
      const status = bufferTikTokReadiness();
      assert.equal(status.configured, true);
      assert.equal(status.connected, true);
      assert.equal(status.channel, "dreamly_art");
      assert.equal(status.error, "");
      assert.equal(status.dailyLimit, BUFFER_TIKTOK_DAILY_POST_LIMIT);
      assert.equal(status.usedLast24h, null);
      assert.equal(status.remainingLast24h, null);
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("TikTok readiness without BUFFER_API_KEY is not configured", () => {
  withBufferEnv({ username: "dreamly_art" }, () => {
    const status = bufferTikTokReadiness();
    assert.equal(status.configured, false);
    assert.equal(status.connected, false);
    assert.match(status.error, /BUFFER_API_KEY/);
  });
});

test("HTTP 429 is explained as a Buffer quota wait, not a broken connection", () => {
  const withRetry = bufferRateLimitMessage("15");
  assert.match(withRetry, /Buffer rate-limited TikTok publishing/);
  assert.match(withRetry, /15 seconds \(Retry-After\)/);
  assert.match(withRetry, /click TikTok again/);
  assert.doesNotMatch(withRetry, /connection broken|disconnected|unavailable/i);

  const withoutRetry = bufferRateLimitMessage(null);
  assert.equal(
    withoutRetry,
    "Buffer rate-limited TikTok publishing. Wait, then click TikTok again.",
  );
});

test("Buffer TikTok quota uses Buffer's 25 posts / 24h cap", () => {
  const mid = tiktokBufferQuota(7);
  assert.equal(mid.dailyLimit, 25);
  assert.equal(mid.usedLast24h, 7);
  assert.equal(mid.remainingLast24h, 18);
  assert.equal(tiktokBufferQuotaRemainingLabel(mid), "7 / 25 за 24 ч · осталось 18");

  const empty = tiktokBufferQuotaRemainingLabel({
    dailyLimit: 25,
    usedLast24h: null,
    remainingLast24h: null,
  });
  assert.equal(empty, "До 25 видео / 24 ч (Buffer)");

  const full = tiktokBufferQuota(25);
  assert.equal(full.remainingLast24h, 0);
  assert.equal(tiktokBufferQuotaRemainingLabel(full), "25 / 25 за 24 ч · осталось 0");
});
