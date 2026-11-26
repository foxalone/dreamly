import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { POST } from "../app/api/dreams/ios-analysis-promo/route";

test("iOS YourFit grants only one fully watched analysis per viewer", async t => {
  const app = initializeApp({ projectId: "demo-ios-analysis-promo" }, "project-server");
  t.after(() => deleteApp(app));
  const db = getFirestore(app);
  t.mock.method(getAuth(app), "verifyIdToken", async () => ({ uid: "account" }));
  let now = Date.now();
  t.mock.method(Date, "now", () => now);

  type Row = Record<string, unknown>;
  const records = new Map<string, Row>();
  const doc = (path: string) => ({ path });
  const collection = (path: string) => ({ doc: (id: string) => doc(`${path}/${id}`) });
  const get = (ref: ReturnType<typeof doc>) => ({ data: () => records.get(ref.path) });
  const set = (ref: ReturnType<typeof doc>, patch: Row) => {
    records.set(ref.path, { ...records.get(ref.path), ...patch });
  };
  t.mock.method(db, "collection", collection);
  t.mock.method(db, "doc", doc);
  const tx = { get, getAll: (...refs: ReturnType<typeof doc>[]) => refs.map(get), set, update: set };
  t.mock.method(db, "runTransaction", async (work: (transaction: typeof tx) => unknown) => work(tx));

  const guest = "17f69553-1335-4503-984f-79d2c927ad38";
  const otherGuest = "02f4cce1-5c55-4ce2-a3ac-2b8b85ae7c38";
  const sessionId = (number: number) => `c6cd20e8-2d2d-4bee-9771-${String(number).padStart(12, "0")}`;
  function reward(number: number, guestId: string | null, extra: Row = {}) {
    const id = sessionId(number);
    records.set(`androidAnalysisRewards/${id}`, {
      uid: null, guestId, state: "pending", platform: "ios", rewardTarget: { action: "analysis", key: `dream-${number}` },
      adDeadlineMs: now + 15 * 60_000, ...extra,
    });
    return id;
  }
  function request(id: string, action: "start" | "complete", cookie: string | null = guest, account = false, ip = "192.0.2.1") {
    return POST(new Request("https://dreamly.test/api/dreams/ios-analysis-promo", {
      method: "POST",
      headers: { ...(cookie ? { Cookie: `dreamly_guest=${cookie}` } : {}), "x-real-ip": ip },
      body: JSON.stringify({ sessionId: id, action, ...(account ? { idToken: "token" } : {}) }),
    }));
  }

  const first = reward(1, guest);
  const second = reward(2, guest);
  assert.equal((await request(first, "complete")).status, 403);
  assert.equal((await request(first, "start", otherGuest)).status, 403);
  assert.equal((await request(reward(3, guest, { platform: "android" }), "start")).status, 403);
  assert.equal((await request(reward(4, guest, { rewardTarget: { action: "reading" } }), "start")).status, 403);
  assert.equal((await request(first, "start")).status, 200);
  now += 12_999;
  assert.equal((await request(first, "complete")).status, 409);
  assert.equal(records.get(`androidAnalysisRewards/${first}`)?.state, "pending");
  assert.equal(records.has(`guestQuickSymbol/${guest}`), false);
  now++;
  assert.deepEqual(await (await request(first, "complete")).json(), { state: "granted" });
  assert.equal(records.get(`androidAnalysisRewards/${first}`)?.state, "granted");
  assert.equal((await request(first, "complete")).status, 200);
  assert.equal((await request(second, "start")).status, 403);
  assert.equal((await request(reward(5, otherGuest), "start", otherGuest)).status, 403);

  const directAccount = reward(6, null, { uid: "account" });
  const accountStart = await request(directAccount, "start", null, true);
  assert.equal(accountStart.status, 200);
  const accountGuest = accountStart.cookies.get("dreamly_guest")?.value;
  assert.ok(accountGuest);
  now += 13_000;
  assert.equal((await request(directAccount, "complete", accountGuest, true)).status, 200);
  assert.equal((await request(reward(7, null, { uid: "account" }), "start", otherGuest, true)).status, 403);
  assert.equal((await request(reward(8, accountGuest), "start", accountGuest, false, "192.0.2.2")).status, 403);
});
