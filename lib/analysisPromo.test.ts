import assert from "node:assert/strict";
import test from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { POST } from "../app/api/dreams/analysis-promo/route";
import { consumeGuestAsk } from "../app/api/dreams/_lib/guestQuota";
import { ANALYSIS_PROMO_DURATION_MS } from "./analysisPromo";

test("the full YourFit interval earns exactly one analysis, in the original viewer session", async (t) => {
  const app = initializeApp({ projectId: "demo-analysis-promo" }, "project-server");
  const db = getFirestore(app);
  const docs = new Map<string, Record<string, unknown>>();
  type Ref = { path: string };
  type Data = Record<string, unknown>;
  const save = (ref: Ref, data: Data) => {
    const value = { ...docs.get(ref.path) };
    for (const [key, field] of Object.entries(data)) {
      if (field instanceof FieldValue && field.isEqual(FieldValue.increment(1))) {
        value[key] = Number(value[key] ?? 0) + 1;
      } else if (field instanceof FieldValue && field.isEqual(FieldValue.increment(-1))) {
        value[key] = Number(value[key] ?? 0) - 1;
      } else {
        value[key] = field;
      }
    }
    docs.set(ref.path, value);
  };
  let tail = Promise.resolve();
  t.mock.method(db, "runTransaction", <T>(work: (tx: unknown) => Promise<T>) => {
    const result = tail.then(() => work({
      get: async (ref: Ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
      set: save,
      update: save,
      create: (ref: Ref, data: Data) => {
        assert.ok(!docs.has(ref.path));
        docs.set(ref.path, data);
      },
    }));
    tail = result.then(() => {}, () => {});
    return result;
  });
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-11-28T12:00:00Z") });
  t.after(async () => { t.mock.restoreAll(); await deleteApp(app); });

  const web = "e48f1078-7c52-410a-8b90-0ac82f42e90a";
  const android = "b80c84ba-d52e-41cb-a63f-e3e714349a12";
  const guest = "61e8bfbc-c56d-4fc0-9cd8-69f2b8a04a02";
  const other = "5ae082db-9d07-48e8-bbb2-7156d095e111";
  const ip = "192.0.2.100";
  const post = (sessionId: string, action: string, platform = "web", viewer = guest) => POST(new Request("http://localhost/api/dreams/analysis-promo", {
    method: "POST", headers: { cookie: `dreamly_guest=${viewer}`, "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ platform, sessionId, action }),
  }));

  assert.equal((await post(web, "complete")).status, 403);
  assert.deepEqual(await (await post(web, "start")).json(), { state: "playing" });
  assert.deepEqual(await consumeGuestAsk(guest, ip), { ok: false, reason: "first_ad" });
  t.mock.timers.tick(ANALYSIS_PROMO_DURATION_MS - 1);
  assert.equal((await post(web, "complete")).status, 409);
  t.mock.timers.tick(1);
  assert.equal((await post(web, "complete", "web", other)).status, 403);
  assert.equal((await post(web, "complete", "android")).status, 403);
  assert.deepEqual(await (await post(web, "complete")).json(), { state: "granted" });
  assert.deepEqual(await (await post(web, "complete")).json(), { state: "granted" });
  assert.equal(docs.get(`guestQuickSymbol/${guest}`)?.adAnalysisCredits, 1);
  assert.ok((await consumeGuestAsk(guest, ip)).ok);
  assert.deepEqual(await consumeGuestAsk(guest, ip), { ok: false, reason: "ip_limit" });

  const path = `androidAnalysisRewards/${android}`;
  docs.set(path, {
    guestId: guest, uid: null, platform: "android", state: "pending", adDeadlineMs: Date.now() + 60_000,
    unit: "ca-app-pub-1234567890123456/1234567890", rewardTarget: { action: "analysis", key: "selected-dream" },
  });
  assert.equal((await post(android, "complete", "android")).status, 403);
  assert.equal((await post(android, "start", "android")).status, 200);
  t.mock.timers.tick(ANALYSIS_PROMO_DURATION_MS - 1);
  assert.equal((await post(android, "complete", "android")).status, 409);
  t.mock.timers.tick(1);
  assert.deepEqual(await (await post(android, "complete", "android")).json(), { state: "granted" });
  assert.equal(docs.get(path)?.rewardSource, "yourfit");
  assert.equal(docs.get(path)?.state, "granted");
  assert.deepEqual(await (await post(android, "complete", "android")).json(), { state: "granted" });
  assert.equal(docs.get(`guestQuickSymbol/${guest}`)?.adAnalysisCredits, 0);

  t.mock.timers.tick(11 * 60_000);
  assert.equal((await post(web, "complete")).status, 403);
});
