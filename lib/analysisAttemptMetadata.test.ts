import assert from "node:assert/strict";
import test from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { analysisAttemptContext, analysisAttemptResult } from "./analysisAttempts";
import { startAnalysisAttempt, finishAnalysisAttempt, reportAttemptEvent, recordAttemptAccess, recoverUndeliveredGuestAnalysis } from "../app/api/dreams/_lib/analysisAttempts";
import { guestDreamSnapshotId } from "../app/api/dreams/_lib/guestDreamSnapshot";
import { POST as analyzeDream } from "../app/api/dreams/analyze/route";

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
  assert.equal((eventsBeforeSuccess as unknown[]).length, 5);
  assert.equal(records.get(path)?.reason, "auth_popup_blocked");
  await finishAnalysisAttempt(id, 200, undefined, { analysis: "Reading", model: "test-model", emojis: [{ native: "🐍", secret: "omit" }] }, Date.now() - 100);
  assert.equal(records.get(path)?.analysis, "Reading");
  assert.deepEqual(records.get(path)?.emojis, [{ native: "🐍" }]);
  assert.ok(Number(records.get(path)?.durationMs) >= 100);
  await reportAttemptEvent(id, null, input.guestId, "auth_cancelled");
  assert.equal(records.get(path)?.status, "succeeded");
  assert.equal(records.get(path)?.reason, "succeeded");
  assert.equal((records.get(path)?.events as unknown[]).length, 7);
  assert.equal(await startAnalysisAttempt(input, req), id);
  assert.equal((records.get(path)?.events as unknown[]).length, 8);
  for (let i = 0; i < 85; i++) await reportAttemptEvent(id, null, input.guestId, "auth_opened");
  assert.equal((records.get(path)?.events as unknown[]).length, 80);
  assert.equal(records.get(path)?.requestCount, 2);
  assert.equal(records.get(path)?.createdAtMs, first.createdAtMs);
  assert.equal(records.get(path)?.analysis, null);
  assert.equal(records.get(path)?.httpStatus, null);

  // Keep the same journey across a date change, with ownership and content checks.
  const proto = Object.getPrototypeOf(db.doc(path));
  t.mock.method(proto, "get", async function (this: { path: string }) {
    return { data: () => records.get(this.path) };
  });
  const originalNow = Date.now;
  t.mock.method(Date, "now", () => originalNow() + 86_400_000);
  assert.equal(await startAnalysisAttempt({ ...input, uid: "signed-user", attemptId: id }, req), id);
  assert.equal(records.get(path)?.uid, "signed-user");
  assert.notEqual(await startAnalysisAttempt({ ...input, guestId: "other-guest", attemptId: id }, req), id);
  assert.notEqual(await startAnalysisAttempt({ ...input, text: "Changed dream", attemptId: id }, req), id);
  await recordAttemptAccess(id, null, "other-guest");
  assert.notEqual((records.get(path)?.events as { event: string }[]).at(-1)?.event, "ad_access_granted");
  await recordAttemptAccess(id, "signed-user", null);
  assert.equal((records.get(path)?.events as { event: string; source: string }[]).at(-1)?.source, "server");
  await reportAttemptEvent(id, "signed-user", null, "analysis_displayed");
  assert.equal(records.get(path)?.displayedAtMs, null); // Cannot claim a pending answer was displayed.
  await finishAnalysisAttempt(id, 200, undefined, { analysis: "Final reading" });
  await reportAttemptEvent(id, "signed-user", null, "analysis_displayed");
  assert.ok(records.get(path)?.displayedAtMs);
  const confirmedHistory = records.get(path)?.events;
  await reportAttemptEvent(id, "signed-user", null, "analysis_displayed");
  assert.deepEqual(records.get(path)?.events, confirmedHistory); // Reopening does not flood the history.
  await reportAttemptEvent(id, "signed-user", null, "analysis_client_failed");
  assert.equal(records.get(path)?.status, "succeeded");
  assert.equal(records.get(path)?.analysis, "Final reading");

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

test("a guest can recover a prepared answer until display, even after a legacy quota rejection", async (t) => {
  const app = initializeApp({ projectId: "demo-attempt-recovery" });
  const db = getFirestore(app);
  const records = new Map<string, Record<string, unknown>>();
  const write = (ref: { path: string }, data: Record<string, unknown>) => {
    records.set(ref.path, { ...records.get(ref.path), ...data });
  };
  t.mock.method(db, "runTransaction", async (fn: (tx: unknown) => unknown) => fn({
    get: async (ref: { path: string }) => ({ data: () => records.get(ref.path) }), set: write, update: write,
  }));
  t.after(async () => { t.mock.restoreAll(); await deleteApp(app); });

  const input = { text: "A walk through a forest", uid: null, guestId: "deca-fbad-ace0", lang: "en", lens: "psychological" };
  const req = new Request("https://example.test/api/dreams/analyze", { headers: { "x-vercel-ip-country": "US" } });
  const id = await startAnalysisAttempt(input, req);
  assert.ok(id);
  const path = `analysis_attempts/${id}`;
  const retry = (recoverOnly: boolean) => analyzeDream(new Request(req.url, {
    method: "POST", headers: { cookie: `dreamly_guest=${input.guestId}` },
    body: JSON.stringify({ ...input, attemptId: id, source: "guest_journal", recoverOnly }),
  }));
  assert.equal(await recoverUndeliveredGuestAnalysis(input), null);
  assert.equal((await retry(true)).status, 404);

  assert.equal(await reportAttemptEvent(id, null, input.guestId, "yourfit_promo_impression"), false);
  const reading = { analysis: "Reading", analysisLang: "en", model: "test-model", guest: true, yourfitPromo: true, emojis: [{ native: "🌲", name: "Tree" }] };
  await finishAnalysisAttempt(id, 200, undefined, reading);
  assert.deepEqual(await recoverUndeliveredGuestAnalysis(input), { id, result: reading });
  for (const recoverOnly of [true, false]) {
    const response = await retry(recoverOnly);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Dreamly-Attempt"), id);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), reading);
  }
  const sameAttempt = { ...input, attemptId: id };
  assert.equal(await recoverUndeliveredGuestAnalysis({ ...sameAttempt, guestId: "other-guest" }), null);
  assert.equal(await recoverUndeliveredGuestAnalysis({ ...sameAttempt, text: "Another dream" }), null);
  assert.equal(await recoverUndeliveredGuestAnalysis({ ...sameAttempt, lang: "ru" }), null);
  assert.equal(await recoverUndeliveredGuestAnalysis({ ...sameAttempt, lens: "spiritual" }), null);
  assert.equal(records.get(path)?.requestCount, 1);
  assert.equal(await reportAttemptEvent(id, null, "other-guest", "yourfit_promo_click"), false);
  assert.equal(await reportAttemptEvent(id, null, input.guestId, "yourfit_promo_impression"), true);
  const impressionHistory = records.get(path)?.events;
  await reportAttemptEvent(id, null, input.guestId, "yourfit_promo_impression");
  assert.deepEqual(records.get(path)?.events, impressionHistory);
  await reportAttemptEvent(id, null, input.guestId, "yourfit_promo_click");
  assert.equal(records.get(path)?.status, "succeeded");

  const startedAtMs = records.get(path)?.startedAtMs;
  const snapshot = `guest_dreams/${guestDreamSnapshotId(input.guestId, input.text)}`;
  records.set(snapshot, { ...input, analysis: reading.analysis, analysisModel: reading.model, emojis: reading.emojis, analysisAtMs: startedAtMs });
  // Reproduce the old deployment losing the saved answer on a retry.
  assert.equal(await startAnalysisAttempt(input, req), id);
  assert.equal(records.get(path)?.yourfitPromo, false);
  assert.equal(await reportAttemptEvent(id, null, input.guestId, "yourfit_promo_click"), false);
  await finishAnalysisAttempt(id, 401, "GUEST_LIMIT_REACHED", { reason: "ip_limit" });
  assert.equal(records.get(path)?.analysis, null);
  const storedDream = records.get(snapshot)!;
  records.set(snapshot, { ...storedDream, analysisAtMs: Number(startedAtMs) - 1 });
  assert.equal(await recoverUndeliveredGuestAnalysis(sameAttempt), null);
  records.set(snapshot, storedDream);
  assert.equal((await recoverUndeliveredGuestAnalysis(sameAttempt))?.result.analysis, reading.analysis);
  assert.equal(records.get(path)?.requestCount, 2);
  await reportAttemptEvent(id, null, input.guestId, "analysis_displayed");
  assert.ok(records.get(path)?.displayedAtMs);
  assert.equal(records.get(path)?.guestResponse, null);
  assert.equal(await recoverUndeliveredGuestAnalysis(sameAttempt), null);
  assert.equal(await startAnalysisAttempt(input, req), id);
  await finishAnalysisAttempt(id, 401, "GUEST_LIMIT_REACHED", { reason: "ip_limit" });
  assert.equal(await recoverUndeliveredGuestAnalysis(sameAttempt), null);
});
