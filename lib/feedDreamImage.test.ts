import assert from "node:assert/strict";
import test from "node:test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { DocumentReference, getFirestore } from "firebase-admin/firestore";
import sharp from "sharp";
import { GET, POST } from "../app/api/dreams/image/[id]/route";
import { PRIMARY_ADMIN_UID } from "./auth/adminUid";
import { beginImage, claimWebImageReward, createImageAttempt, imageStatus, readGalleryImage, setImagePublication } from "./dreamImage";
import { imagePublication } from "./dreamImageGallery";

test("only the primary admin can manage a feed image, including for a guest dream", async t => {
  const app = initializeApp({ projectId: "demo-feed-images" }, "project-server");
  t.after(() => deleteApp(app));
  const db = getFirestore(app);
  const id = "guest_example";
  const context = { params: Promise.resolve({ id }) };
  const url = "http://localhost/api/dreams/image/guest_example?scope=feed";
  const headers = { Authorization: "Bearer test" };
  assert.equal((await GET(new Request(url), context)).status, 401);
  t.mock.method(getAuth(app), "verifyIdToken", async () => ({ uid: "ordinary-viewer" }));
  assert.equal((await GET(new Request(url + "&image=1", { headers }), context)).status, 403);
  for (const action of ["attempt", "reward", "start", "publish"]) {
    const request = new Request(url, { method: "POST", headers, body: JSON.stringify({ action }) });
    assert.equal((await POST(request, context)).status, 403);
  }

  const settings = { FAL_KEY: "test", GOOGLE_DREAM_IMAGE_REWARDED_WEB_PATH: "/123/test" };
  for (const [key, value] of Object.entries(settings)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const dream = db.doc(`shared_dreams/${id}`);
  const publication = imagePublication(dream);
  const scene = "  Вышла в коридор, где шёл ремонт.\nНе смогла найти знакомую дверь и лифт.  ";
  const records = new Map<string, Record<string, unknown>>([[dream.path, { text: scene, fromGuest: true }]]);
  const snapshot = (ref: DocumentReference) => ({
    exists: records.has(ref.path), data: () => records.get(ref.path), get: (key: string) => records.get(ref.path)?.[key],
  });
  const getAll = (...refs: Array<DocumentReference | { fieldMask: string[] }>) =>
    refs.filter((ref): ref is DocumentReference => ref instanceof DocumentReference).map(snapshot);
  const write = (ref: DocumentReference, data: Record<string, unknown>) =>
    records.set(ref.path, { ...records.get(ref.path), ...data });
  const tx = { get: snapshot, getAll, update: write, set: write, create: write, delete: (ref: DocumentReference) => records.delete(ref.path) };
  t.mock.method(db, "runTransaction", async (run: (transaction: typeof tx) => unknown) => run(tx));
  t.mock.method(db, "getAll", getAll);
  t.mock.method(DocumentReference.prototype, "get", function (this: DocumentReference) { return snapshot(this); });
  const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: "blue" } }).png().toBuffer();
  const generationRequests: RequestInit[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL, init?: RequestInit) => {
    if (url === "https://fal.run/fal-ai/flux/schnell") {
      assert.ok(init);
      generationRequests.push(init);
      return Response.json({ images: [{ url: "https://test.fal.media/image" }] });
    }
    assert.equal(String(url), "https://test.fal.media/image");
    return new Response(new Uint8Array(input));
  });

  const admin = PRIMARY_ADMIN_UID;
  await assert.rejects(beginImage(admin, id, undefined, "feed"), { code: "AD_UNVERIFIED" });
  const attempt = await createImageAttempt(admin, id, "web", "feed");
  assert.ok("attemptId" in attempt);
  const result = await claimWebImageReward(admin, id, attempt.attemptId, "feed");
  assert.ok(result.work);
  await result.work();
  assert.equal(generationRequests.length, 1);
  const { prompt, enable_safety_checker } = JSON.parse(String(generationRequests[0].body));
  assert.equal(prompt, `${scene}\n\nVisual style: cinematic hand-painted digital illustration with visible brushstrokes, softly stylized shapes, layered colors, and luminous dreamlike lighting.`);
  assert.equal(enable_safety_checker, true);
  assert.deepEqual(await imageStatus(admin, id, "feed"), { state: "ready", published: false });
  await assert.rejects(readGalleryImage(publication.id, false), { status: 404 });
  assert.equal((await createImageAttempt(admin, id, "web", "feed")).state, "ready");
  assert.equal((await setImagePublication(admin, id, true, "feed")).published, true);
  assert.ok((await readGalleryImage(publication.id, true)).length);
  assert.ok((await readGalleryImage(publication.id, false)).length);
  write(dream, { deleted: true });
  await assert.rejects(readGalleryImage(publication.id, false), { status: 404 });
  write(dream, { deleted: false });
  await setImagePublication(admin, id, false, "feed");
  await assert.rejects(readGalleryImage(publication.id, false), { status: 404 });
  assert.deepEqual(await imageStatus(admin, id, "feed"), { state: "ready", published: false });
});
