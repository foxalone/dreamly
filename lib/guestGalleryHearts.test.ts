import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";

import { claimGuestGalleryHearts, guestGalleryLikes, toggleGuestGalleryHeart } from "./guestGalleryHearts";

function memoryDb(seed: Record<string, Record<string, unknown>>) {
  const docs = new Map(Object.entries(seed));
  const ref = (path: string) => ({
    path,
    collection: (name: string) => collection(`${path}/${name}`),
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
  });
  const collection = (path: string) => ({
    doc: (id: string) => ref(`${path}/${id}`),
    get: async () => ({
      docs: [...docs.keys()]
        .filter((key) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/"))
        .map((key) => ({ id: key.slice(path.length + 1), ref: ref(key), data: () => docs.get(key) })),
    }),
  });
  const db = {
    doc: ref,
    collection,
    runTransaction: async <T>(work: (tx: unknown) => Promise<T>) => work({
      get: async (document: { path: string }) => ({ exists: docs.has(document.path), data: () => docs.get(document.path) }),
      set: (document: { path: string }, patch: Record<string, unknown>) => {
        docs.set(document.path, { ...docs.get(document.path), ...patch });
      },
      delete: (document: { path: string }) => { docs.delete(document.path); },
    }),
  } as unknown as Firestore;
  return { db, docs };
}

test("a guest can heart and unheart gallery art with a persisted choice", async () => {
  const { db, docs } = memoryDb({});
  assert.deepEqual(await toggleGuestGalleryHeart(db, "guest-a", "stairs"), { slug: "stairs", liked: true, count: 1 });
  assert.deepEqual(await guestGalleryLikes(db, "guest-a"), { stairs: true });
  assert.deepEqual(await toggleGuestGalleryHeart(db, "guest-a", "stairs"), { slug: "stairs", liked: false, count: 0 });
  assert.deepEqual(await guestGalleryLikes(db, "guest-a"), {});
  assert.equal(docs.has("gallery_hearts/stairs/guests/guest-a"), false);
});

test("sign-in moves gallery hearts and removes duplicate counts", async () => {
  const { db, docs } = memoryDb({
    "gallery_hearts/stairs": { count: 2 },
    "gallery_hearts/stairs/guests/guest-a": { slug: "stairs" },
    "gallery_hearts/stairs/users/user-a": { slug: "stairs" },
    "guestQuickSymbol/guest-a/galleryHearts/stairs": { slug: "stairs" },
    "gallery_hearts/snake": { count: 1 },
    "gallery_hearts/snake/guests/guest-a": { slug: "snake" },
    "guestQuickSymbol/guest-a/galleryHearts/snake": { slug: "snake" },
  });
  assert.equal(await claimGuestGalleryHearts(db, "guest-a", "user-a"), 2);
  assert.equal(docs.get("gallery_hearts/stairs")?.count, 1);
  assert.equal(docs.get("gallery_hearts/snake")?.count, 1);
  assert.equal(docs.has("gallery_hearts/stairs/guests/guest-a"), false);
  assert.equal(docs.has("gallery_hearts/snake/guests/guest-a"), false);
  assert.equal(docs.has("gallery_hearts/snake/users/user-a"), true);
  assert.equal(docs.has("users/user-a/galleryHearts/snake"), true);
  assert.equal(await claimGuestGalleryHearts(db, "guest-a", "user-a"), 0);
});
