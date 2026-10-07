import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { grantAdReward } from "../app/api/dreams/_lib/subscription";
import { guestAdReward } from "../app/api/dreams/_lib/guestQuota";
import { validRewardId } from "./rewardedReceipt";

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
          set: (r: Ref, data: Record<string, unknown>) => {
            writes.push(() => { docs.set(r.path, { ...docs.get(r.path), ...data }); });
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

test("failed transaction cannot persist either credit or receipt", async () => {
  const { db, docs } = fixture(true);
  await assert.rejects(grantAdReward("alice", "analysis", id, db), /storage unavailable/);
  assert.equal(docs.size, 0);
  await assert.rejects(guestAdReward("guest", "test-ip", true, id, db));
  assert.equal(docs.size, 0);
});
