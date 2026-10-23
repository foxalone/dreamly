import assert from "node:assert/strict";
import test from "node:test";
import { dictionaryVideoState } from "./adminDictionaryVideoQueue";
import { dictionaryVideoQueueCopy } from "./i18n/dictionaryVideoQueue";

test("gray before selection; yellow while waiting, processing or failed; green only when a file exists", () => {
  assert.equal(dictionaryVideoState(false), "idle");
  assert.equal(dictionaryVideoState(true), "queued");
  for (const status of ["queued", "processing", "failed"]) {
    assert.equal(dictionaryVideoState(true, { status }), "queued");
    assert.equal(dictionaryVideoState(false, { status }), "queued");
  }
  assert.equal(dictionaryVideoState(true, { status: "completed", videoUrl: "" }), "queued");
  assert.equal(dictionaryVideoState(true, { status: "completed", videoUrl: "https://example.test/video.mp4" }), "completed");
  assert.equal(dictionaryVideoState(false, { status: "completed", videoUrl: "https://example.test/video.mp4" }), "completed");
});

test("queue controls and explanations are available in all six locales", () => {
  assert.deepEqual(Object.keys(dictionaryVideoQueueCopy).sort(), ["ar", "de", "en", "es", "pt", "ru"]);
  for (const copy of Object.values(dictionaryVideoQueueCopy)) {
    for (const value of Object.values(copy)) assert.ok(value.trim().length > 0);
  }
});

import type { Firestore } from "firebase-admin/firestore";
import { AUTO_USED_SLUGS_COLLECTION } from "./adminAutoDictionary";
import { DICTIONARY_VIDEO_QUEUE_COLLECTION } from "./adminDictionaryVideoQueue";
import { nextRequestedDictionaryVideo, requestDictionaryVideo } from "../app/api/admin/_lib/dictionaryVideoQueue";

function memoryDb(initial: Record<string, Record<string, unknown>> = {}) {
  const records = new Map(Object.entries(initial));
  const doc = (path: string) => ({
    path, id: path.split("/").at(-1)!,
    get: async () => snapshot(path),
    update: async (data: Record<string, unknown>) => { records.set(path, { ...records.get(path), ...data }); },
  });
  const snapshot = (path: string) => ({
    id: path.split("/").at(-1)!, exists: records.has(path), ref: doc(path),
    get: (field: string) => records.get(path)?.[field], data: () => records.get(path),
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => doc(`${name}/${id}`),
      orderBy: (field: string) => ({ get: async () => ({ docs: [...records.keys()]
        .filter((path) => path.startsWith(`${name}/`))
        .sort((a, b) => Number(records.get(a)?.[field]) - Number(records.get(b)?.[field]))
        .map(snapshot) }) }),
    }),
    getAll: async (...refs: Array<{ path: string }>) => refs.map((ref) => snapshot(ref.path)),
    runTransaction: async (fn: (transaction: unknown) => Promise<void>) => fn({
      get: async (ref: { path: string }) => snapshot(ref.path),
      create: (ref: { path: string }, data: Record<string, unknown>) => {
        assert.equal(records.has(ref.path), false);
        records.set(ref.path, data);
      },
    }),
  };
  return { db: db as unknown as Firestore, records };
}

const queue = (slug: string) => `${DICTIONARY_VIDEO_QUEUE_COLLECTION}/${slug}`;
const reservation = (slug: string) => `${AUTO_USED_SLUGS_COLLECTION}/${slug}`;

test("clicks persist only intent; repeat clicks preserve the original FIFO position", async () => {
  const { db, records } = memoryDb();
  assert.equal(await requestDictionaryVideo("snake", "admin", db), "queued");
  const firstRequest = records.get(queue("snake"));
  assert.equal(await requestDictionaryVideo("snake", "admin", db), "queued");
  assert.equal(records.get(queue("snake")), firstRequest);
  assert.deepEqual([...records.keys()], [queue("snake")]);
});

test("nightly selection is FIFO, retains failed jobs, skips ready videos and falls back when empty", async () => {
  const { db, records } = memoryDb({
    [queue("snake")]: { requestedAt: 20, status: "queued" },
    [queue("black-dog")]: { requestedAt: 10, status: "processing" },
    [reservation("black-dog")]: { videoJobId: "dog-video" },
    "adminVideoJobs/dog-video": { status: "failed", videoUrl: "" },
  });
  assert.equal((await nextRequestedDictionaryVideo(db))?.id, "black-dog");
  records.set("adminVideoJobs/dog-video", { status: "completed", videoUrl: "https://example.test/dog.mp4" });
  assert.equal((await nextRequestedDictionaryVideo(db))?.id, "snake");
  assert.equal(records.get(queue("black-dog"))?.status, "completed");
  records.set(queue("snake"), { requestedAt: 20, status: "completed" });
  assert.equal(await nextRequestedDictionaryVideo(db), null);
});

test("an existing completed English video stays green and cannot be queued twice", async () => {
  const { db, records } = memoryDb({
    [reservation("snake")]: { videoJobId: "snake-video" },
    "adminVideoJobs/snake-video": { status: "completed", videoUrl: "https://example.test/snake.mp4" },
  });
  assert.equal(await requestDictionaryVideo("snake", "admin", db), "completed");
  assert.equal(records.has(queue("snake")), false);
});
