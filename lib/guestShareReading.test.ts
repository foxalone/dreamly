import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { guestDreamSnapshotId } from "../app/api/dreams/_lib/guestDreamSnapshot";
import { DELETE, POST } from "../app/api/dreams/share-guest/route";
import { guestSharedDocId, guestSharedDreamDocId } from "./shareBadges";

test("guest sharing accepts a saved interpretation without a web quota charge", async (t) => {
  const app = initializeApp({ projectId: "demo-guest-share" }, "project-server");
  t.after(() => deleteApp(app));
  const db = getFirestore(app);
  const guestId = "b2c41257-8ca0-4e89-9b84-5a719864579e";
  const text = "I walked across a painted wooden bridge.";
  const analysis = "The bridge suggests a transition.";
  const snapshotPath = "guest_dreams/" + guestDreamSnapshotId(guestId, text);
  const publicId = guestSharedDreamDocId(guestId, text);
  const publicPath = "shared_dreams/" + publicId;
  const analysisAtMs = Date.parse("2026-11-25T00:00:10.000Z");
  const verifiedReading = { guestId, text, analysis, platform: "android", lang: "en", lens: "psychology", analysisAtMs };
  const records = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  let sharedToday = 0;

  function write(ref: { path: string }, data: Record<string, unknown>) {
    writes.push(ref.path);
    records.set(ref.path, { ...records.get(ref.path), ...data });
  }
  function ref(path: string) {
    return {
      id: path.split("/").at(-1),
      path,
      collection: (collection: string) => ({ doc: (id: string) => ref(`${path}/${collection}/${id}`) }),
      update: async (data: Record<string, unknown>) => write({ path }, data),
    };
  }

  t.mock.method(db, "collection", (name: string) => {
    const query = {
      doc: (id: string) => ref(`${name}/${id}`),
      where: () => query,
      count: () => ({ get: async () => ({ data: () => ({ count: 0 }) }) }),
    };
    return query;
  });
  const tx = {
    get: async ({ path }: { path: string }) => ({
      exists: records.has(path),
      data: () => path.startsWith("guestShareIp/") ? { used: sharedToday } : records.get(path),
    }),
    set: write,
  };
  t.mock.method(db, "runTransaction", async (run: (transaction: typeof tx) => unknown) => run(tx));
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected network call"); });

  function share(dreamText = text, sourceType = "dream") {
    return POST(new Request("http://localhost/api/dreams/share-guest", {
      method: "POST",
      headers: { Cookie: `dreamly_guest=${guestId}`, "x-real-ip": "127.0.0.1" },
      body: JSON.stringify({ text: dreamText, sourceType }),
    }));
  }

  function reset() {
    records.clear();
    writes.length = 0;
    sharedToday = 0;
  }

  for (const badReading of [
    undefined,
    { ...verifiedReading, guestId: "different-guest" },
    { ...verifiedReading, text: "A different dream" },
    { ...verifiedReading, deleted: true },
    { ...verifiedReading, analysis: "  " },
  ]) {
    reset();
    if (badReading) records.set(snapshotPath, badReading);
    const response = await share();
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "NO_READING");
    assert.equal(writes.length, 0);
  }

  reset();
  records.set(snapshotPath, verifiedReading);
  const response = await share();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sharedId, publicId);
  assert.equal(records.get(publicPath)?.analysisText, analysis);
  assert.equal(records.get(publicPath + "/private/analysis")?.text, analysis);
  assert.equal(records.get(snapshotPath)?.shared, true);
  assert.equal(writes.filter((path) => path.startsWith("guestShareIp/")).length, 1);

  writes.length = 0;
  const retry = await share();
  assert.equal(retry.status, 409);
  assert.equal((await retry.json()).sharedId, publicId);
  assert.equal(writes.length, 0);

  reset();
  records.set(snapshotPath, verifiedReading);
  sharedToday = 3;
  const capped = await share();
  assert.equal(capped.status, 429);
  assert.equal((await capped.json()).code, "IP_LIMIT");
  assert.equal(writes.length, 0);

  reset();
  records.set(snapshotPath, { ...verifiedReading, rewarded: true });
  sharedToday = 3;
  assert.equal((await share()).status, 200);
  assert.ok(writes.includes(publicPath));
  assert.ok(writes.every((path) => !path.startsWith("guestShareIp/")));

  reset();
  records.set(snapshotPath, verifiedReading);
  const startedAtMs = analysisAtMs - 30_000;
  const day = new Date(startedAtMs).toISOString().slice(0, 10);
  const attemptId = createHash("sha256").update(JSON.stringify([
    `g:${guestId}`, text, verifiedReading.lang, verifiedReading.lens, day,
  ])).digest("hex");
  records.set("analysis_attempts/" + attemptId, {
    ...verifiedReading, status: "succeeded", startedAtMs,
    events: [{ source: "server", event: "ad_credit_used", atMs: startedAtMs + 1 }],
  });
  sharedToday = 3;
  assert.equal((await share()).status, 200);
  assert.ok(writes.every((path) => !path.startsWith("guestShareIp/")));

  reset();
  records.set(snapshotPath, verifiedReading);
  records.set("analysis_attempts/" + attemptId, {
    ...verifiedReading, status: "succeeded", startedAtMs,
    events: [{ source: "server", event: "ad_credit_used", atMs: startedAtMs - 1 }],
  });
  sharedToday = 3;
  assert.equal((await share()).status, 429);
  assert.equal(writes.length, 0);

  reset();
  records.set("guestQuickSymbol/" + guestId, { used: 1 });
  assert.equal((await share()).status, 200);
  assert.equal(fetch.mock.callCount(), 0);

  reset();
  const shortText = "Снилась луна";
  const shortSnapshotPath = "guest_dreams/" + guestDreamSnapshotId(guestId, shortText);
  assert.equal((await share(shortText)).status, 422);
  records.set(shortSnapshotPath, { ...verifiedReading, text: shortText, rewarded: true });
  sharedToday = 3;
  assert.equal((await share(shortText, "story")).status, 422);
  assert.equal((await share(shortText)).status, 200);
  assert.equal(records.get("shared_dreams/" + guestSharedDreamDocId(guestId, shortText))?.text, shortText);
  assert.equal((await share("a@b.com")).status, 422);
});

test("a guest can remove their own published dream or story", async (t) => {
  const app = initializeApp({ projectId: "demo-guest-delete" }, "project-server");
  t.after(() => deleteApp(app));
  const db = getFirestore(app);
  const guest = "c0feb199-e028-4288-bab5-e2e410f7a1ec";
  const other = "a1156220-404c-4531-87a7-52f42d5686c7";
  const dream = guestSharedDreamDocId(guest, "A long dream that I shared anonymously.");
  const story = guestSharedDreamDocId(guest, "A short story shared to the feed.");
  const legacy = guestSharedDocId(guest);
  const original = { ownerGuestId: guest, ownerUid: null, title: "Entry", text: "Text", analysisText: "Reading", deleted: false };
  const posts = new Map<string, Record<string, unknown>>([
    [dream, { ...original, sourceType: "dream" }],
    [story, { ...original, sourceType: "story" }],
    [legacy, { ...original }],
  ]);

  t.mock.method(db, "collection", () => ({ doc: (id: string) => ({ id }) }));
  const update = t.mock.fn(({ id }: { id: string }, fields: Record<string, unknown>) => {
    posts.set(id, { ...posts.get(id), ...fields });
  });
  const tx = {
    get: async ({ id }: { id: string }) => ({ exists: posts.has(id), data: () => posts.get(id) }),
    update,
  };
  t.mock.method(db, "runTransaction", async (run: (transaction: typeof tx) => unknown) => run(tx));

  function remove(sharedId: string, guestId = guest) {
    return DELETE(new Request("https://dreamly.test/api/dreams/share-guest", {
      method: "DELETE",
      headers: guestId ? { Cookie: `dreamly_guest=${guestId}` } : {},
      body: JSON.stringify({ sharedId }),
    }));
  }

  assert.equal((await remove(dream, "")).status, 400);
  assert.equal((await remove(dream, other)).status, 403);
  posts.set(dream, { ...original, sourceType: "dream", ownerGuestId: other });
  assert.equal((await remove(dream)).status, 403);
  posts.set(dream, { ...original, sourceType: "dream", ownerUid: "account" });
  assert.equal((await remove(dream)).status, 403);
  assert.equal(update.mock.callCount(), 0);
  posts.set(dream, { ...original, sourceType: "dream" });

  for (const id of [dream, story, legacy]) {
    const result = await remove(id);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true });
    assert.equal(posts.get(id)?.deleted, true);
    assert.equal(posts.get(id)?.deletedBy, "user");
    assert.equal(posts.get(id)?.text, "");
    assert.equal(posts.get(id)?.analysisText, "");
    const before = update.mock.callCount();
    assert.equal((await remove(id)).status, 200);
    assert.equal(update.mock.callCount(), before);
  }

  const missing = guestSharedDreamDocId(guest, "Never published");
  assert.equal((await remove(missing)).status, 200);
  assert.equal(update.mock.callCount(), 3);
});
