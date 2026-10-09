import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { grantAdReward } from "../app/api/dreams/_lib/subscription";
import { guestAdReward } from "../app/api/dreams/_lib/guestQuota";
import { consumeTranslationAccess } from "../app/api/dreams/_lib/translationQuota";
import { validRewardId } from "./rewardedReceipt";
import { matchingTranslationAdGrant, translationAdTarget } from "./translationAdGrant";

const id = "dc408274-a6fd-41ba-911d-d467bf668f42";
function fixture(failCommit = false) {
  const docs = new Map<string, Record<string, unknown>>();
  type Ref = { path: string; collection: (name: string) => { doc: (id: string) => Ref } };
  const ref = (path: string): Ref => ({ path, collection: name => ({ doc: id => ref(`${path}/${name}/${id}`) }) });
  // Serialize transactions, stage writes and enforce reads before writes.
  let tail = Promise.resolve();
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: <T>(fn: (tx: unknown) => Promise<T>) => {
      const result = tail.then(async () => {
        const writes: (() => void)[] = [];
        const value = await fn({
          get: async (r: Ref) => {
            assert.equal(writes.length, 0);
            return { exists: docs.has(r.path), data: () => docs.get(r.path) };
          },
          create: (r: Ref, data: Record<string, unknown>) => {
            assert.equal(docs.has(r.path), false);
            writes.push(() => { docs.set(r.path, data); });
          },
          delete: (r: Ref) => { writes.push(() => { docs.delete(r.path); }); },
          set: (r: Ref, data: Record<string, unknown>) => {
            writes.push(() => {
              const next = { ...docs.get(r.path), ...data };
              for (const [key, value] of Object.entries(data)) if (value?.constructor?.name === "DeleteTransform") delete next[key];
              docs.set(r.path, next);
            });
          },
        });
        if (failCommit) throw new Error("storage unavailable");
        writes.forEach(write => write());
        return value;
      });
      tail = result.then(() => {}, () => {});
      return result;
    },
  } as unknown as Firestore;
  return { db, docs };
}

test("reject malformed receipt keys", () => {
  for (const value of [undefined, "", "../bad", {}, "not-a-uuid"]) assert.equal(validRewardId(value), false);
  assert.equal(validRewardId(id), true);
});

test("translation pass requires the exact dream and language and expires", () => {
  const target = translationAdTarget("dream-a", "ru");
  assert.ok(target);
  assert.equal(translationAdTarget("../dream", "ru"), null);
  assert.equal(matchingTranslationAdGrant({ ...target, expiresAtMs: 101 }, target, 100), true);
  assert.equal(matchingTranslationAdGrant({ ...target, expiresAtMs: 100 }, target, 100), false);
  assert.equal(matchingTranslationAdGrant({ ...target, expiresAtMs: 101 }, { sharedDreamId: "dream-b", targetLang: "ru" }, 100), false);
});

test("concurrent duplicate signed-in grants credit once; replay returns current balance", async () => {
  const { db, docs } = fixture();
  const results = await Promise.all(Array.from({ length: 5 }, () => grantAdReward("alice", "analysis", id, db)));
  assert.ok(results.every(r => "credits" in r && r.credits === 1));
  assert.equal(docs.get("users/alice")?.adRewardsTodayCount, 1);
  docs.set("users/alice", { ...docs.get("users/alice"), adAnalysisCredits: 0 });
  const replay = await grantAdReward("alice", "analysis", id, db);
  assert.ok("credits" in replay && replay.credits === 0);
  const mismatch = await grantAdReward("alice", "save", id, db);
  assert.ok("error" in mismatch && mismatch.error.status === 409);
});

test("guest receipt cannot mint again after earned credit is spent", async () => {
  const { db, docs } = fixture();
  await Promise.all(Array.from({ length: 5 }, () => guestAdReward("guest", "test-ip", true, id, db)));
  const path = "guestQuickSymbol/guest";
  assert.equal(docs.get(path)?.adRewardsTodayCount, 1);
  docs.set(path, { ...docs.get(path), adAnalysisCredits: 0 });
  const replay = await guestAdReward("guest", "test-ip", true, id, db);
  assert.equal(replay.credits, 0);
  assert.equal(replay.replayed, true);
  assert.equal(docs.get(path)?.adRewardsTodayCount, 1);
});

test("translation reward opens only the selected dream and language, without a banked credit", async () => {
  const { db, docs } = fixture();
  const target = { sharedDreamId: "dream-a", targetLang: "ru" };
  const other = { sharedDreamId: "dream-b", targetLang: "ru" };
  const userPath = "users/alice";
  docs.set(userPath, { translateDayKey: new Date().toISOString().slice(0, 10), translateFreeCount: 1, adTranslateCredits: 8 });
  assert.ok("error" in await consumeTranslationAccess("alice", other, db));
  const granted = await grantAdReward("alice", "translate", id, db, target);
  assert.ok("credits" in granted && granted.credits === 1);
  assert.equal(docs.get(userPath)?.adTranslateCredits, 0);
  assert.ok("error" in await consumeTranslationAccess("alice", other, db));
  assert.ok("ok" in await consumeTranslationAccess("alice", target, db));
  assert.ok("error" in await consumeTranslationAccess("alice", target, db));
  const replay = await grantAdReward("alice", "translate", id, db, target);
  assert.ok("credits" in replay && replay.credits === 0);
  const changedTarget = await grantAdReward("alice", "translate", id, db, other);
  assert.ok("error" in changedTarget && changedTarget.error.status === 409);
});

test("failed transaction cannot persist either credit or receipt", async () => {
  const { db, docs } = fixture(true);
  await assert.rejects(grantAdReward("alice", "analysis", id, db), /storage unavailable/);
  assert.equal(docs.size, 0);
  await assert.rejects(guestAdReward("guest", "test-ip", true, id, db));
  assert.equal(docs.size, 0);
});
