import assert from "node:assert/strict";
import test from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { consumeAnalysisAccess, refundFreeAnalysis } from "../app/api/dreams/_lib/subscription";
import { canAnalyzeDream, utcDayKey } from "./subscriptions/status";

test("new signed-in accounts receive a free analysis without a welcome-credit grant", async (t) => {
  // Run the actual server quota code without Firebase credentials or AI calls.
  const app = initializeApp({ projectId: "demo-new-user-analysis" }, "project-server");
  const db = getFirestore(app);
  const records = new Map<string, Record<string, unknown>>();
  let tail = Promise.resolve();
  t.mock.method(db, "runTransaction", <T>(fn: (tx: unknown) => Promise<T>) => {
    const result = tail.then(async () => {
      const writes: (() => void)[] = [];
      const value = await fn({
        get: async (ref: { path: string }) => {
          assert.equal(writes.length, 0, "Firestore requires reads before writes");
          return { exists: records.has(ref.path), data: () => records.get(ref.path) };
        },
        set: (ref: { path: string }, data: Record<string, unknown>, options: { merge?: boolean }) => {
          writes.push(() => records.set(ref.path, options?.merge ? { ...records.get(ref.path), ...data } : data));
        },
      });
      writes.forEach(write => write());
      return value;
    });
    tail = result.then(() => {}, () => {});
    return result;
  });
  t.after(async () => { t.mock.restoreAll(); await deleteApp(app); });

  for (const profile of [undefined, { subscriptionStatus: "none", displayName: "New user", welcomeBonusGranted: true }]) {
    await t.test(profile ? "profile already exists" : "profile has not been created yet", async () => {
      records.clear();
      if (profile) records.set("users/new-user", profile);
      assert.equal(canAnalyzeDream(profile), true);

      assert.deepEqual(await consumeAnalysisAccess("new-user"), { uid: "new-user", charge: "free" });
      const saved = records.get("users/new-user");
      assert.equal(saved?.freeAnalysesUsed, 1);
      assert.equal(saved?.freeAnalysesTodayCount, 1);
      assert.equal(saved?.freeAnalysisDayKey, utcDayKey());
      assert.equal(saved?.adAnalysisCredits, undefined);
      if (profile) assert.equal(saved?.displayName, profile.displayName);
      assert.equal(canAnalyzeDream(saved), false);

      const second = await consumeAnalysisAccess("new-user");
      assert.ok("error" in second);
      assert.equal(second.error.status, 402);
      assert.equal((await second.error.json()).code, "FREE_DAILY_LIMIT");
      assert.equal(records.get("users/new-user")?.freeAnalysesUsed, 1);
    });
  }

  await t.test("simultaneous first requests allow only one free analysis today", async () => {
    records.clear();
    const results = await Promise.all(Array.from({ length: 5 }, () => consumeAnalysisAccess("new-user")));
    assert.equal(results.filter(result => "charge" in result && result.charge === "free").length, 1);
    assert.equal(results.filter(result => "error" in result).length, 4);
    assert.equal(records.get("users/new-user")?.freeAnalysesUsed, 1);
  });

  await t.test("failed AI analysis can refund and retry the free entitlement", async () => {
    records.clear();
    await consumeAnalysisAccess("new-user");
    await refundFreeAnalysis("new-user");
    assert.equal(records.get("users/new-user")?.freeAnalysesUsed, 0);
    assert.equal(records.get("users/new-user")?.freeAnalysesTodayCount, 0);
    assert.equal(canAnalyzeDream(records.get("users/new-user")), true);
    assert.deepEqual(await consumeAnalysisAccess("new-user"), { uid: "new-user", charge: "free" });
  });
});
