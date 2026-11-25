import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { POST } from "../app/api/dreams/android-reading-promo/route";

test("YourFit unlocks only the selected reading for its viewer after the video", async (t) => {
  const app = initializeApp({ projectId: "demo-android-reading-promo" }, "project-server");
  t.after(() => deleteApp(app));
  const db = getFirestore(app);
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const guest = "2cbb9253-889c-4dc0-b8fb-127adf093441";
  const other = "4f66738a-a6d5-4272-a593-93b9d0161adc";
  const dream = "short-preview";
  const dreamPath = `shared_dreams/${dream}`;
  const unlock = `guestQuickSymbol/${guest}/readingUnlocks/${dream}`;
  const records = new Map<string, Record<string, unknown>>([
    [dreamPath, { analysisIsPreview: true, analysisText: "A preview", deleted: false }],
    [dreamPath + "/private/analysis", { text: "This is the full interpretation." }],
    ["shared_dreams/no-reading", { analysisIsPreview: true, analysisText: "", deleted: false }],
  ]);
  const snapshot = (path: string) => ({ exists: records.has(path), data: () => records.get(path) });
  function ref(path: string) {
    return {
      path,
      get: async () => snapshot(path),
      collection: (collection: string) => ({ doc: (id: string) => ref(`${path}/${collection}/${id}`) }),
      create: async (data: Record<string, unknown>) => {
        assert(!records.has(path));
        records.set(path, data);
      },
    };
  }
  t.mock.method(db, "collection", (collection: string) => ({ doc: (id: string) => ref(`${collection}/${id}`) }));
  t.mock.method(db, "doc", ref);
  const tx = {
    getAll: async (...refs: ReturnType<typeof ref>[]) => refs.map((doc) => snapshot(doc.path)),
    create: (doc: ReturnType<typeof ref>, data: Record<string, unknown>) => doc.create(data),
  };
  t.mock.method(db, "runTransaction", async (work: (transaction: typeof tx) => unknown) => work(tx));
  function request(id: string, sessionId?: string, cookie: string | null = guest) {
    return POST(new Request("https://dreamly.test/api/dreams/android-reading-promo", {
      method: "POST",
      headers: cookie ? { Cookie: `dreamly_guest=${cookie}` } : {},
      body: JSON.stringify({ sharedDreamId: id, sessionId }),
    }));
  }

  const start = await request(dream);
  assert.equal(start.status, 200);
  const { sessionId } = await start.json();
  assert.equal(typeof sessionId, "string");
  const fresh = await request(dream, undefined, null);
  assert.match(fresh.headers.get("Set-Cookie") ?? "", /^dreamly_guest=/);
  assert.equal((await request("no-reading")).status, 404);
  assert.equal((await request("missing")).status, 404);
  assert.equal((await request(dream, "invalid")).status, 400);
  assert.equal((await request(dream, sessionId, other)).status, 402);
  assert.equal((await request(dream, sessionId, null)).status, 402);
  assert.equal((await request("another-dream", sessionId)).status, 402);
  now += 12_999;
  const early = await request(dream, sessionId);
  assert.equal(early.status, 409);
  assert.equal((await early.json()).code, "AD_CONFIRMATION_PENDING");
  assert(!records.has(unlock));

  now++;
  const done = await request(dream, sessionId);
  assert.deepEqual(await done.json(), { analysis: "This is the full interpretation." });
  const saved = records.get(unlock);
  assert.deepEqual(saved, { sharedDreamId: dream, atMs: now, source: "yourfit" });
  now++;
  assert.equal((await request(dream, sessionId)).status, 200);
  assert.equal(records.get(unlock), saved);

  records.set(dreamPath, { deleted: true });
  assert.equal((await request(dream, sessionId)).status, 404);
  now += 15 * 60_000;
  assert.equal((await request(dream, sessionId)).status, 402);
});
