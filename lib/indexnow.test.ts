import assert from "node:assert/strict";
import test from "node:test";

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  INDEXNOW_KEY,
  collectIndexNowUrls,
  indexNowKeyLocation,
  indexNowPayload,
  indexNowSinceDate,
  submitIndexNowUrls,
} from "./indexnow";

test("IndexNow key matches the public verification file name", () => {
  assert.match(INDEXNOW_KEY, /^[a-zA-Z0-9-]{8,128}$/);
  assert.equal(indexNowKeyLocation(), `https://dreamly.art/${INDEXNOW_KEY}.txt`);
  assert.equal(INDEXNOW_HOST, "dreamly.art");
});

test("recent window is a UTC date 14 days back", () => {
  assert.equal(indexNowSinceDate(new Date("2026-09-11T10:20:00Z")), "2026-08-28");
});

test("recent collect always includes localized home and dictionary hubs", () => {
  const { urls, since } = collectIndexNowUrls("recent", new Date("2026-09-11T10:20:00Z"));
  assert.equal(since, "2026-08-28");
  assert.ok(urls.includes("https://dreamly.art/"));
  assert.ok(urls.includes("https://dreamly.art/dreams"));
  assert.ok(urls.includes("https://dreamly.art/es/dreams"));
  assert.ok(urls.includes("https://dreamly.art/ru"));
  assert.ok(urls.length < 2000);
});

test("all collect covers every locale of a known symbol", () => {
  const { urls, since } = collectIndexNowUrls("all");
  assert.equal(since, null);
  assert.ok(urls.includes("https://dreamly.art/dreams/snake"));
  assert.ok(urls.includes("https://dreamly.art/es/dreams/snake"));
  assert.ok(urls.includes("https://dreamly.art/ar/dreams/snake"));
  assert.ok(urls.length > 1000);
});

test("submit posts the IndexNow JSON payload", async () => {
  const urls = ["https://dreamly.art/dreams/snake"];
  let body = "";
  const result = await submitIndexNowUrls(urls, async (input, init) => {
    assert.equal(String(input), INDEXNOW_ENDPOINT);
    assert.equal(init?.method, "POST");
    body = String(init?.body || "");
    return new Response("", { status: 202 });
  });
  assert.deepEqual(result, { submitted: 1, status: 202 });
  assert.deepEqual(JSON.parse(body), indexNowPayload(urls));
});
