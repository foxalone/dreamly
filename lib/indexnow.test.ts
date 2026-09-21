import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";

import robots from "../app/robots";
import { readIndexNowState, submitChangedIndexNow, submitOneIndexNow } from "../app/api/admin/_lib/indexnow";
import { refreshDreamPageImageCache } from "../app/api/admin/_lib/dreamPageImageCache";
import { saveDreamPageImage } from "./dreamPageImageStore.mjs";
import { listPublicPages } from "./publicPages";
import {
  INDEXNOW_BATCH_LIMIT,
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  type IndexNowFetch,
  collectIndexNowUrls,
  currentIndexNowSnapshot,
  diffIndexNowSnapshot,
  indexNowFingerprint,
  indexNowKey,
  indexNowKeyLocation,
  indexNowPayload,
  isIndexNowEligiblePath,
  isKnownPublicUrl,
  notifyIndexNow,
  submitIndexNowUrls,
  toIndexNowUrl,
} from "./indexnow";

const KEY = "3c472be7ec3b7ed38ae74cb3b6dbb792";

function withKey<T>(key: string | undefined, run: () => Promise<T> | T): Promise<T> | T {
  const before = process.env.INDEXNOW_KEY;
  if (key === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = key;
  const restore = () => {
    if (before === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = before;
  };
  try {
    const out = run();
    if (out instanceof Promise) return out.finally(restore);
    restore();
    return out;
  } catch (error) {
    restore();
    throw error;
  }
}

function fakeFetch(status = 200) {
  const calls: Array<{ url: string; body: ReturnType<typeof indexNowPayload> }> = [];
  const fetchImpl: IndexNowFetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(status >= 400 ? "Invalid key" : "", { status });
  };
  return { calls, fetchImpl };
}

test("key comes from INDEXNOW_KEY only and must look like an IndexNow key", () => {
  assert.equal(indexNowKey({ INDEXNOW_KEY: KEY }), KEY);
  assert.equal(indexNowKey({ INDEXNOW_KEY: ` ${KEY} ` }), KEY);
  assert.equal(indexNowKey({}), "");
  assert.equal(indexNowKey({ INDEXNOW_KEY: "short" }), "");
  assert.equal(indexNowKey({ INDEXNOW_KEY: "has spaces in it" }), "");
  assert.equal(indexNowKeyLocation(KEY), `https://dreamly.art/${KEY}.txt`);
  assert.equal(indexNowKeyLocation(""), "");
  assert.equal(INDEXNOW_HOST, "dreamly.art");
});

test("relative paths become canonical absolute URLs; other hosts are refused", () => {
  assert.equal(toIndexNowUrl("/dreams/snake"), "https://dreamly.art/dreams/snake");
  assert.equal(toIndexNowUrl("/es/dreams/snake/"), "https://dreamly.art/es/dreams/snake");
  assert.equal(toIndexNowUrl("/"), "https://dreamly.art/");
  assert.equal(toIndexNowUrl("https://dreamly.art/ru?utm=x#top"), "https://dreamly.art/ru");
  assert.equal(toIndexNowUrl("https://www.dreamly.art/dreams/snake"), null);
  assert.equal(toIndexNowUrl("https://example.com/dreams/snake"), null);
  assert.equal(toIndexNowUrl("http://dreamly.art/dreams/snake"), null);
  assert.equal(toIndexNowUrl("dreams/snake"), null);
  assert.equal(toIndexNowUrl(""), null);
  assert.equal(toIndexNowUrl("/en/dreams/snake"), null);
});

test("private, API, noindex and robots-disallowed paths are never submitted", () => {
  for (const path of ["/api/dreams/snake", "/_next/static/x.js", "/sitemap.xml", "/robots.txt", `/${KEY}.txt`,
    "/signin", "/es/signin", "/app", "/app/dreams", "/ru/app/profile", "/app/profile/admin-dashboard", "/payment-success"]) {
    assert.equal(isIndexNowEligiblePath(path), false, path);
  }
  const rules = robots().rules;
  for (const rule of Array.isArray(rules) ? rules : [rules]) {
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    for (const path of disallow) if (path) assert.equal(isIndexNowEligiblePath(path), false, path);
  }
  const { urls, skipped } = collectIndexNowUrls([
    "/dreams/snake", "https://dreamly.art/dreams/snake", "/dreams/snake/", "/app/dreams", "https://evil.example/x",
  ]);
  assert.deepEqual(urls, ["https://dreamly.art/dreams/snake"]);
  assert.equal(skipped.length, 2);
});

test("every sitemap URL is eligible, and the inventory check knows real pages only", () => {
  const pages = listPublicPages();
  const { urls, skipped } = collectIndexNowUrls(pages.map((page) => page.url));
  assert.deepEqual(skipped, []);
  assert.equal(urls.length, new Set(pages.map((page) => page.url)).size);
  assert.equal(isKnownPublicUrl("https://dreamly.art/es/dreams/snake"), true);
  assert.equal(isKnownPublicUrl("https://dreamly.art/dreams/not-a-real-dream-symbol"), false);
});

test("submit posts the IndexNow JSON payload once per 10k batch, deduplicated", async () => {
  const { calls, fetchImpl } = fakeFetch(202);
  const result = await submitIndexNowUrls(["/dreams/snake", "https://dreamly.art/dreams/snake", "/es/dreams/snake"], fetchImpl, KEY);
  assert.deepEqual(result, { submitted: 2, skipped: 0, status: 202 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, INDEXNOW_ENDPOINT);
  assert.deepEqual(calls[0].body, {
    host: "dreamly.art",
    key: KEY,
    keyLocation: `https://dreamly.art/${KEY}.txt`,
    urlList: ["https://dreamly.art/dreams/snake", "https://dreamly.art/es/dreams/snake"],
  });

  const many = Array.from({ length: INDEXNOW_BATCH_LIMIT + 1 }, (_, i) => `/dreams/page-${i}`);
  const big = fakeFetch(200);
  assert.equal((await submitIndexNowUrls(many, big.fetchImpl, KEY)).submitted, INDEXNOW_BATCH_LIMIT + 1);
  assert.equal(big.calls.length, 2);
  assert.equal(big.calls[1].body.urlList.length, 1);

  const none = fakeFetch(200);
  assert.deepEqual(await submitIndexNowUrls(["https://example.com/"], none.fetchImpl, KEY), { submitted: 0, skipped: 1, status: 0 });
  assert.equal(none.calls.length, 0);
});

test("notifyIndexNow never throws: bad status, transport error, missing key", async () => {
  await withKey(KEY, async () => {
    const rejected = await notifyIndexNow("/dreams/snake", { fetchImpl: fakeFetch(403).fetchImpl });
    assert.equal(rejected.ok, false);
    assert.match(rejected.error || "", /HTTP 403/);
    const down = await notifyIndexNow(["/dreams/snake"], { fetchImpl: async () => { throw new Error("ECONNRESET"); } });
    assert.deepEqual(down, { ok: false, submitted: 0, skipped: 1, status: 0, error: "ECONNRESET" });
    const { calls, fetchImpl } = fakeFetch(200);
    assert.deepEqual(await notifyIndexNow("/dreams/snake", { fetchImpl }), { ok: true, submitted: 1, skipped: 0, status: 200 });
    assert.equal(calls.length, 1);
  });
  await withKey(undefined, async () => {
    const { calls, fetchImpl } = fakeFetch(200);
    const result = await notifyIndexNow("/dreams/snake", { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  });
});

test("fingerprints follow sitemap lastmod and page text; snapshot covers the whole inventory", () => {
  const pages = listPublicPages();
  const snapshot = currentIndexNowSnapshot(pages);
  assert.equal(Object.keys(snapshot).length, new Set(pages.map((page) => page.url)).size);
  assert.ok(snapshot["/dreams/snake"] && snapshot["/es/dreams/snake"] && snapshot["/"] && snapshot["/ru/dreams/why-we-dream"]);
  assert.notEqual(snapshot["/dreams/snake"], snapshot["/es/dreams/snake"]);
  // Fits comfortably in one Firestore document (1 MiB).
  assert.ok(JSON.stringify(snapshot).length < 700_000, `snapshot is ${JSON.stringify(snapshot).length} bytes`);

  const snake = pages.find((page) => page.url === "https://dreamly.art/dreams/snake")!;
  assert.equal(indexNowFingerprint(snake), snapshot["/dreams/snake"]);
  assert.notEqual(indexNowFingerprint({ ...snake, lastModified: "1999-01-01" }), snapshot["/dreams/snake"]);
  const legal = pages.find((page) => page.url === "https://dreamly.art/privacy")!;
  assert.notEqual(indexNowFingerprint({ ...legal, lastModified: "1999-01-01" }), snapshot["/privacy"]);
});

test("diff reports created, updated and removed pages (a slug rename yields old + new)", () => {
  const diff = diffIndexNowSnapshot(
    { "/dreams/old-slug": "a", "/dreams/same": "b", "/dreams/edited": "c" },
    { "/dreams/new-slug": "a", "/dreams/same": "b", "/dreams/edited": "d" },
  );
  assert.deepEqual(diff, { added: ["/dreams/new-slug"], updated: ["/dreams/edited"], removed: ["/dreams/old-slug"] });
});

function stateDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const db = {
    doc: (path: string) => ({
      get: async () => ({ data: () => docs.get(path) }),
      set: async (data: Record<string, unknown>) => { docs.set(path, data); },
    }),
  } as unknown as Firestore;
  return { db, docs };
}

test("changed-mode: first run records a baseline, later runs submit only the diff, failures keep the baseline", async () => {
  await withKey(KEY, async () => {
    const { db, docs } = stateDb();
    const now = () => new Date("2026-09-21T06:30:00Z");
    const first = fakeFetch(200);
    const baseline = await submitChangedIndexNow({ db, fetchImpl: first.fetchImpl, now });
    assert.equal(baseline.baseline, true);
    assert.equal(baseline.submitted, 0);
    assert.equal(first.calls.length, 0);
    assert.deepEqual(await readIndexNowState({ db }), { count: Object.keys(currentIndexNowSnapshot()).length, submittedAt: null });

    // Nothing changed → nothing sent.
    const quiet = fakeFetch(200);
    const unchanged = await submitChangedIndexNow({ db, fetchImpl: quiet.fetchImpl, now });
    assert.deepEqual([unchanged.added, unchanged.updated, unchanged.removed, unchanged.submitted], [0, 0, 0, 0]);
    assert.equal(quiet.calls.length, 0);

    // Simulate a previous deploy: one page renamed, one edited.
    const state = docs.get("cache_revalidation/indexNow")!;
    const previous = JSON.parse(String(state.pages)) as Record<string, string>;
    previous["/dreams/old-slug-gone"] = previous["/dreams/snake"];
    previous["/es/dreams/snake"] = "stale";
    docs.set("cache_revalidation/indexNow", { ...state, pages: JSON.stringify(previous) });

    const failing = fakeFetch(422);
    await assert.rejects(submitChangedIndexNow({ db, fetchImpl: failing.fetchImpl, now }), /HTTP 422/);
    assert.equal(JSON.parse(String(docs.get("cache_revalidation/indexNow")!.pages))["/es/dreams/snake"], "stale");

    const ok = fakeFetch(200);
    const result = await submitChangedIndexNow({ db, fetchImpl: ok.fetchImpl, now });
    assert.deepEqual([result.added, result.updated, result.removed, result.submitted, result.status], [0, 1, 1, 2, 200]);
    assert.deepEqual(ok.calls[0].body.urlList.sort(), ["https://dreamly.art/dreams/old-slug-gone", "https://dreamly.art/es/dreams/snake"]);
    assert.equal((await readIndexNowState({ db }))?.submittedAt, "2026-09-21T06:30:00.000Z");
    assert.equal(JSON.parse(String(docs.get("cache_revalidation/indexNow")!.pages))["/dreams/old-slug-gone"], undefined);
  });
});

test("manual single-URL test accepts one existing public page only", async () => {
  await withKey(KEY, async () => {
    const { calls, fetchImpl } = fakeFetch(200);
    const result = await submitOneIndexNow("/es/dreams/snake", { fetchImpl });
    assert.equal(result.url, "https://dreamly.art/es/dreams/snake");
    assert.deepEqual(calls[0].body.urlList, ["https://dreamly.art/es/dreams/snake"]);
    await assert.rejects(submitOneIndexNow("https://example.com/dreams/snake", { fetchImpl }), /URL_NOT_INDEXABLE/);
    await assert.rejects(submitOneIndexNow("/app/dreams", { fetchImpl }), /URL_NOT_INDEXABLE/);
    await assert.rejects(submitOneIndexNow("/dreams/not-a-real-dream-symbol", { fetchImpl }), /URL_NOT_PUBLIC/);
    assert.equal(calls.length, 1);
  });
  await withKey(undefined, async () => {
    await assert.rejects(submitOneIndexNow("/dreams/snake", { fetchImpl: fakeFetch(200).fetchImpl }), /not configured/);
  });
});

test("a page image change pings IndexNow for the symbol + gallery pages, after the cache is refreshed", async () => {
  const images = new Map<string, Record<string, unknown>>();
  let hashes: Record<string, string | null> = {};
  const invalidated: string[] = [];
  const notified: string[][] = [];
  const db = {
    doc: () => ({
      get: async () => ({ data: () => ({ hashes: { ...hashes } }) }),
      set: async (data: { hashes: Record<string, string | null> }) => { hashes = { ...hashes, ...data.hashes }; },
    }),
    collection: () => ({
      get: async () => ({ docs: [...images].map(([id, data]) => ({ id, data: () => data })) }),
      doc: (slug: string) => ({ get: async () => ({ data: () => images.get(slug) }), slug }),
    }),
    runTransaction: async (fn: (transaction: unknown) => unknown) => fn({
      get: async (ref: { slug: string }) => ({ data: () => images.get(ref.slug) }),
      set: (ref: { slug: string }, data: Record<string, unknown>) => images.set(ref.slug, data),
    }),
  } as unknown as Firestore;
  const deps = {
    db,
    invalidate: (path: string) => { invalidated.push(path); },
    notify: async (paths: string[]) => { assert.ok(invalidated.length > 0); notified.push(paths); },
  };

  assert.equal((await refreshDreamPageImageCache(undefined, deps)).changed, 0);
  assert.deepEqual(notified, []);
  await saveDreamPageImage(db, "snake", { imageJobId: "job-1", imageUrl: "https://example.test/v1.png", subject: "snake" }, "2026-09-21T00:00:00Z");
  assert.equal((await refreshDreamPageImageCache(undefined, deps)).changed, 1);
  assert.equal(notified.length, 1);
  const pinged: string[] = notified[0] ?? [];
  assert.ok(pinged.includes("/dreams/snake") && pinged.includes("/es/dreams/snake") && pinged.includes("/gallery"));
  // The helper itself drops the sitemap entry and keeps only canonical page URLs.
  const { urls, skipped } = collectIndexNowUrls(pinged);
  assert.deepEqual(skipped, ["/sitemap.xml"]);
  assert.equal(urls.length, pinged.length - 1);

  // A throwing notifier does not break the refresh.
  images.set("snake", { imageJobId: "job-2", imageUrl: "https://example.test/v2.png", subject: "snake" });
  const boom = { ...deps, notify: async () => { throw new Error("indexnow down"); } };
  assert.equal((await refreshDreamPageImageCache(undefined, boom)).changed, 1);
});
