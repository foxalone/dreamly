import assert from "node:assert/strict";
import test from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { analysisAttemptContext, analysisAttemptResult } from "./analysisAttempts";
import { startAnalysisAttempt, finishAnalysisAttempt, reportAttemptEvent } from "../app/api/dreams/_lib/analysisAttempts";

test("metadata retains country-only locations and excludes sensitive headers and unknown sources", () => {
  const context = analysisAttemptContext({ text: "two words", source: "untrusted" }, new Headers({
    "x-vercel-ip-country": "br", authorization: "secret", cookie: "secret", "x-forwarded-for": "192.0.2.1",
  }), null);
  assert.equal(context.country, "BR");
  assert.equal(context.city, null);
  assert.equal(context.source, null);
  assert.equal(context.wordCount, 2);
  assert.equal(context.charCount, 9);
  assert.ok(!JSON.stringify(context).includes("secret"));
  assert.ok(!JSON.stringify(context).includes("192.0.2.1"));
  assert.equal(analysisAttemptContext({ text: "" }, new Headers(), null).country, null);
  assert.deepEqual(analysisAttemptResult({ error: "provider secret", idToken: "secret" }), {
    analysis: null, model: null, emojiModel: null, emojis: [],
  });
});

test("attempt lifecycle stores location and successful results, resets retries, and survives geo failure", async (t) => {
  const app = initializeApp({ projectId: "demo-attempt-metadata" });
  const db = getFirestore(app);
  const records = new Map<string, Record<string, unknown>>();
  const write = (ref: { path: string }, data: Record<string, unknown>) => {
    records.set(ref.path, { ...records.get(ref.path), ...data });
  };
  t.mock.method(db, "runTransaction", async (fn: (tx: unknown) => unknown) => fn({
    get: async (ref: { path: string }) => ({ data: () => records.get(ref.path) }), set: write, update: write,
  }));
  t.mock.method(Object.getPrototypeOf(db.doc("analysis_attempts/example")), "update", async function (this: { path: string }, data: Record<string, unknown>) {
    write(this, data);
  });
  t.after(async () => { t.mock.restoreAll(); await deleteApp(app); });
  const input = { text: "I see a snake", uid: null, guestId: "guest-test", lang: "en", lens: "psychological", source: "home_ask" };
  const req = new Request("https://example.test/api/dreams/analyze", { headers: {
    "x-vercel-ip-country": "US", "x-vercel-ip-city": "San%20Jose", "x-vercel-ip-country-region": "CA",
    "x-forwarded-for": "192.0.2.1", "user-agent": "Test browser",
  } });
  const id = await startAnalysisAttempt(input, req);
  assert.ok(id);
  const path = `analysis_attempts/${id}`;
  const first = records.get(path)!;
  assert.equal(first.city, "San Jose");
  assert.equal(first.country, "US");
  assert.equal(first.source, "home_ask");
  assert.equal(first.citySource, "ip");
  assert.equal(first.geoProvider, "vercel");
  assert.equal(first.userAgent, "Test browser");
  assert.equal(first.ip, undefined);
  assert.equal(await reportAttemptEvent(id, null, "someone-else", "auth_opened"), false);
  for (const event of ["ad_unavailable", "auth_opened", "auth_google_started", "auth_popup_blocked"] as const) {
    assert.equal(await reportAttemptEvent(id, null, input.guestId, event), true);
  }
  const eventsBeforeSuccess = records.get(path)?.events;
  assert.equal((eventsBeforeSuccess as unknown[]).length, 4);
  assert.equal(records.get(path)?.reason, "auth_popup_blocked");
  await finishAnalysisAttempt(id, 200, undefined, { analysis: "Reading", model: "test-model", emojis: [{ native: "🐍", secret: "omit" }] }, Date.now() - 100);
  assert.equal(records.get(path)?.analysis, "Reading");
  assert.deepEqual(records.get(path)?.emojis, [{ native: "🐍" }]);
  assert.ok(Number(records.get(path)?.durationMs) >= 100);
  await reportAttemptEvent(id, null, input.guestId, "auth_cancelled");
  assert.equal(records.get(path)?.status, "succeeded");
  assert.equal(records.get(path)?.reason, "succeeded");
  assert.equal((records.get(path)?.events as unknown[]).length, 5);
  assert.equal(await startAnalysisAttempt(input, req), id);
  assert.equal((records.get(path)?.events as unknown[]).length, 5);
  for (let i = 0; i < 85; i++) await reportAttemptEvent(id, null, input.guestId, "auth_opened");
  assert.equal((records.get(path)?.events as unknown[]).length, 80);
  assert.equal(records.get(path)?.requestCount, 2);
  assert.equal(records.get(path)?.createdAtMs, first.createdAtMs);
  assert.equal(records.get(path)?.analysis, null);
  assert.equal(records.get(path)?.httpStatus, null);

  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, options?: RequestInit) => {
    assert.ok(options?.signal);
    throw new Error("geo unavailable");
  });
  const failedGeoId = await startAnalysisAttempt({ ...input, text: "Another dream" }, new Request(req.url, {
    headers: { "x-vercel-ip-country": "DE", "x-forwarded-for": "192.0.2.1" },
  }));
  assert.ok(failedGeoId);
  assert.equal(records.get(`analysis_attempts/${failedGeoId}`)?.country, "DE");
  assert.equal(records.get(`analysis_attempts/${failedGeoId}`)?.city, null);
});
