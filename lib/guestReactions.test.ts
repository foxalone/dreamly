import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";

import { claimGuestReactions, readGuestReactions, toggleGuestReaction } from "./guestReactions";

function memoryDb(seed: Record<string, Record<string, unknown>>) {
  const docs = new Map(Object.entries(seed));
  const snapshot = (path: string) => ({
    id: path.split("/").at(-1)!, ref: ref(path), exists: docs.has(path), data: () => docs.get(path),
  });
  const ref = (path: string) => ({
    path,
    collection: (name: string) => collection(`${path}/${name}`),
    get: async () => snapshot(path),
    set: async (patch: Record<string, unknown>) => docs.set(path, { ...docs.get(path), ...patch }),
  });
  const collection = (path: string) => ({
    doc: (id: string) => ref(`${path}/${id}`),
    select: () => ({ get: async () => collectionSnapshot(path) }),
    get: async () => collectionSnapshot(path),
  });
  const collectionSnapshot = (path: string) => ({
    docs: [...docs.keys()]
      .filter((key) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/"))
      .map(snapshot),
  });
  const db = {
    doc: ref,
    collection,
    getAll: async (...references: { path: string }[]) => references.map((document) => snapshot(document.path)),
    runTransaction: async <T>(work: (tx: unknown) => Promise<T>) => work({
      get: async (document: { path: string }) => snapshot(document.path),
      update: (document: { path: string }, patch: Record<string, unknown>) => {
        const current = { ...docs.get(document.path) };
        for (const [key, value] of Object.entries(patch)) {
          if (key.startsWith("reactions.")) {
            current.reactions = { ...(current.reactions as Record<string, unknown>), [key.slice(10)]: value };
          } else current[key] = value;
        }
        docs.set(document.path, current);
      },
      set: (document: { path: string }, patch: Record<string, unknown>) => {
        docs.set(document.path, { ...docs.get(document.path), ...patch });
      },
      delete: (document: { path: string }) => { docs.delete(document.path); },
    }),
  } as unknown as Firestore;
  return { db, docs };
}

test("guests can turn each reaction on and off without changing another guest's choice", async () => {
  const { db, docs } = memoryDb({
    "shared_dreams/dream-1": { reactions: { heart: 0, like: 0, star: 0 } },
  });
  assert.deepEqual(await toggleGuestReaction(db, "guest-a", "dream-1", "heart"), { active: true, count: 1 });
  assert.deepEqual(await toggleGuestReaction(db, "guest-b", "dream-1", "heart"), { active: true, count: 2 });
  assert.deepEqual(await toggleGuestReaction(db, "guest-a", "dream-1", "like"), { active: true, count: 1 });
  assert.deepEqual(await toggleGuestReaction(db, "guest-a", "dream-1", "heart"), { active: false, count: 1 });
  assert.deepEqual(await readGuestReactions(db, "guest-a", ["dream-1"]), {
    "dream-1": { heart: false, like: true, star: false },
  });
  assert.deepEqual(await readGuestReactions(db, "guest-b", ["dream-1"]), {
    "dream-1": { heart: true, like: false, star: false },
  });
  assert.deepEqual(docs.get("shared_dreams/dream-1")?.reactions, { heart: 1, like: 1, star: 0 });
});

test("missing and deleted dreams cannot receive guest reactions", async () => {
  const { db, docs } = memoryDb({ "shared_dreams/deleted": { deleted: true } });
  assert.equal(await toggleGuestReaction(db, "guest-a", "missing", "star"), null);
  assert.equal(await toggleGuestReaction(db, "guest-a", "deleted", "star"), null);
  assert.equal(docs.has("shared_dreams/deleted/reactions/guest_guest-a"), false);
});

test("sign-in transfers all guest reactions and prevents duplicate counts", async () => {
  const { db, docs } = memoryDb({
    "shared_dreams/one": { reactions: { heart: 2, like: 1, star: 0 } },
    "shared_dreams/one/reactions/guest_guest-a": { heart: true, like: true },
    "shared_dreams/one/reactions/user-a": { heart: true },
    "guestQuickSymbol/guest-a/reactions/one": { dreamId: "one" },
    "shared_dreams/two": { reactions: { heart: 0, like: 0, star: 1 } },
    "shared_dreams/two/reactions/guest_guest-a": { star: true },
  });
  assert.equal(await claimGuestReactions(db, "guest-a", "user-a"), 2);
  assert.deepEqual(docs.get("shared_dreams/one")?.reactions, { heart: 1, like: 1, star: 0 });
  assert.deepEqual(docs.get("shared_dreams/two")?.reactions, { heart: 0, like: 0, star: 1 });
  assert.equal(docs.get("shared_dreams/one/reactions/user-a")?.heart, true);
  assert.equal(docs.get("shared_dreams/one/reactions/user-a")?.like, true);
  assert.equal(docs.get("shared_dreams/two/reactions/user-a")?.star, true);
  assert.equal(docs.has("shared_dreams/one/reactions/guest_guest-a"), false);
  assert.equal(docs.has("shared_dreams/two/reactions/guest_guest-a"), false);
  assert.equal(await claimGuestReactions(db, "guest-a", "user-a"), 0);
});

test("reactions added after an earlier sign-in are claimed from the guest index", async () => {
  const { db, docs } = memoryDb({
    "guestQuickSymbol/guest-a": { reactionsLegacyScannedAtMs: 1 },
    "shared_dreams/dream-1": { reactions: { heart: 0, like: 0, star: 0 } },
  });
  await toggleGuestReaction(db, "guest-a", "dream-1", "star");
  assert.equal(docs.has("guestQuickSymbol/guest-a/reactions/dream-1"), true);
  assert.equal(await claimGuestReactions(db, "guest-a", "user-a"), 1);
  assert.equal(docs.get("shared_dreams/dream-1/reactions/user-a")?.star, true);
  assert.equal(docs.has("guestQuickSymbol/guest-a/reactions/dream-1"), false);
});
