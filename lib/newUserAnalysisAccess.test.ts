import assert from "node:assert/strict";
import test from "node:test";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { consumeAnalysisAccess } from "../app/api/dreams/_lib/subscription";
import { canAnalyzeDream, utcDayKey } from "./subscriptions/status";

test("non-paying accounts use one credit per web or Google Play analysis", async (t) => {
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
      assert.equal(canAnalyzeDream(profile), false);
      const result = await consumeAnalysisAccess("new-user");
      assert.ok("error" in result);
      assert.equal(result.error.status, 402);
      assert.equal((await result.error.json()).code, "SUBSCRIPTION_REQUIRED");
      assert.deepEqual(records.get("users/new-user"), profile);
    });
  }

  await t.test("simultaneous requests share one earned credit", async () => {
    records.set("users/new-user", { adAnalysisCredits: 1, freeAnalysesUsed: 0 });
    const results = await Promise.all(Array.from({ length: 5 }, () => consumeAnalysisAccess("new-user")));
    assert.equal(results.filter(result => "charge" in result && result.charge === "ad").length, 1);
    assert.equal(results.filter(result => "error" in result).length, 4);
    assert.equal(records.get("users/new-user")?.adAnalysisCredits, 0);
    assert.equal(records.get("users/new-user")?.freeAnalysesUsed, 0);
  });

  await t.test("AppGallery free slots and paid daily slots still work", async () => {
    records.clear();
    assert.deepEqual(await consumeAnalysisAccess("new-user", true), { uid: "new-user", charge: "free" });
    assert.equal(records.get("users/new-user")?.freeAnalysisDayKey, utcDayKey());
    const appGallery = await consumeAnalysisAccess("new-user", true);
    assert.ok("error" in appGallery);
    assert.equal((await appGallery.error.json()).code, "FREE_DAILY_LIMIT");

    records.set("users/subscriber", { subscriptionStatus: "active" });
    assert.deepEqual(await consumeAnalysisAccess("subscriber"), { uid: "subscriber", charge: "slot" });
    assert.equal(records.get("users/subscriber")?.dreamsTodayCount, 1);
  });
});
