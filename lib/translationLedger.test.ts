/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { readCachedTranslation, readTranslationUnlock, recordTranslationServe } from "../app/api/dreams/_lib/translationLedger";

function ledger(failCommit = false) {
  const documents = new Map<string, Record<string, any>>();
  function ref(path: string): any {
    return {
      path,
      collection: (name: string) => ({ doc: (id = "event") => ref(`${path}/${name}/${id}`) }),
      get: async () => ({ exists: documents.has(path), data: () => documents.get(path) }),
    };
  }
  const db = {
    doc: ref,
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        set: (r: DocumentReference, data: Record<string, any>, options?: { merge: boolean }) => {
          writes.push(() => {
            const prev = options?.merge ? documents.get(r.path) ?? {} : {};
            documents.set(r.path, {
              ...prev, ...data,
              ...(data.langs ? { langs: { ...prev.langs, ...data.langs } } : {}),
            });
          });
        },
        update: () => {},
        commit: async () => {
          if (failCommit) throw new Error("storage unavailable");
          writes.forEach((write) => write());
        },
      };
    },
  } as unknown as Firestore;
  return { db, documents, dreamRef: ref("shared_dreams/dream") as DocumentReference };
}

for (const allowance of ["free", "ad", "subscription"] as const) {
  test(`${allowance} translation is saved with permanent access isolated by user, dream and language`, async () => {
    const { db, dreamRef } = ledger();
    await recordTranslationServe({
      db, dreamRef, sharedDreamId: "dream", uid: "alice", who: { name: null, email: null },
      targetLang: "ru", source: "ai", model: "translator", translation: "Сон",
      usedDailyFree: allowance === "free", paid: allowance === "subscription",
    });
    assert.equal(await readTranslationUnlock(db, "alice", "dream", "ru"), true);
    assert.equal(await readTranslationUnlock(db, "bob", "dream", "ru"), false);
    assert.equal(await readTranslationUnlock(db, "alice", "another-dream", "ru"), false);
    assert.equal(await readTranslationUnlock(db, "alice", "dream", "de"), false);
    const cached = await readCachedTranslation(dreamRef, {}, "ru");
    assert.equal(cached?.entry.text, "Сон");
    // Reusing the cache for another language must retain the first unlock.
    await recordTranslationServe({
      db, dreamRef, sharedDreamId: "dream", uid: "alice", who: { name: null, email: null },
      targetLang: "de", source: "cache", model: "translator",
      cached: { entry: { text: "Traum", model: "translator", atMs: 1 }, legacy: false },
      usedDailyFree: false, paid: false,
    });
    assert.equal(await readTranslationUnlock(db, "alice", "dream", "ru"), true);
    assert.equal(await readTranslationUnlock(db, "alice", "dream", "de"), true);
  });
}

test("failed persistence rejects instead of reporting an unsaved translation as successful", async () => {
  const { db, dreamRef, documents } = ledger(true);
  await assert.rejects(recordTranslationServe({
    db, dreamRef, sharedDreamId: "dream", uid: "alice", who: { name: null, email: null },
    targetLang: "ru", source: "ai", model: null, translation: "Сон", usedDailyFree: false, paid: false,
  }), /storage unavailable/);
  assert.equal(documents.size, 0);
});

test("storage read errors cannot be mistaken for a missing unlock or cache", async () => {
  const get = async () => { throw new Error("storage unavailable"); };
  const db = { doc: () => ({ get }) } as unknown as Firestore;
  const dreamRef = { collection: () => ({ doc: () => ({ get }) }) } as unknown as DocumentReference;
  await assert.rejects(readTranslationUnlock(db, "alice", "dream", "ru"), /storage unavailable/);
  await assert.rejects(readCachedTranslation(dreamRef, {}, "ru"), /storage unavailable/);
});
