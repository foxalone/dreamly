import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { moderateComment } from "./adminCommentModeration";

function memoryDb(seed: Record<string, Record<string, unknown>>) {
  const docs = new Map(Object.entries(seed));
  const ref = (path: string) => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const snapshot = (path: string) => ({ exists: docs.has(path), data: () => docs.get(path) });
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async <T>(work: (tx: unknown) => Promise<T>) => work({
      get: async (document: { path: string }) => snapshot(document.path),
      set: (document: { path: string }, value: Record<string, unknown>) => docs.set(document.path, value),
      update: (document: { path: string }, patch: Record<string, unknown>) =>
        docs.set(document.path, { ...docs.get(document.path), ...patch }),
      delete: (document: { path: string }) => { docs.delete(document.path); },
    }),
  } as unknown as Firestore;
  return { db, docs };
}

test("soft deletion hides public text, preserves an admin copy, and decrements once", async () => {
  const dream = "shared_dreams/dream1";
  const comment = `${dream}/comments/comment1`;
  const { db, docs } = memoryDb({
    [dream]: { commentCount: 2 },
    [comment]: { text: "A thoughtful interpretation", xpAwarded: 8 },
  });
  await moderateComment(db, "dream1", "comment1", false);
  assert.equal(docs.get(comment)?.text, "");
  assert.equal(docs.get(comment)?.deleted, true);
  assert.equal(docs.get(`${comment}/private/moderation`)?.text, "A thoughtful interpretation");
  assert.equal(docs.get(dream)?.commentCount, 1);
  await moderateComment(db, "dream1", "comment1", false);
  assert.equal(docs.get(dream)?.commentCount, 1);
});

test("hard deletion removes the comment and private copies without a second decrement", async () => {
  const dream = "shared_dreams/dream1";
  const comment = `${dream}/comments/comment1`;
  const { db, docs } = memoryDb({
    [dream]: { commentCount: 1 },
    [comment]: { text: "", deleted: true },
    [`${comment}/private/moderation`]: { text: "Hidden comment" },
    [`${comment}/private/translations`]: { ru: { text: "Перевод" } },
  });
  await moderateComment(db, "dream1", "comment1", true);
  assert.equal(docs.has(comment), false);
  assert.equal(docs.has(`${comment}/private/moderation`), false);
  assert.equal(docs.has(`${comment}/private/translations`), false);
  assert.equal(docs.get(dream)?.commentCount, 1);
});

test("hard deletion of a visible comment decrements the public count", async () => {
  const dream = "shared_dreams/dream2";
  const comment = `${dream}/comments/comment2`;
  const { db, docs } = memoryDb({
    [dream]: { commentCount: 1 },
    [comment]: { text: "A visible comment" },
  });
  await moderateComment(db, "dream2", "comment2", true);
  assert.equal(docs.has(comment), false);
  assert.equal(docs.get(dream)?.commentCount, 0);
});
