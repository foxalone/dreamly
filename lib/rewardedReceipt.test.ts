import { grantAccountHouseAd, inheritGuestHouseAds, consumeAccountHouseAnalysis, finishAccountHouseAnalysis, recoverAccountHouseAnalysis } from "../app/api/dreams/_lib/accountHouseAd";
import { grantGuestHouseAd } from "../app/api/dreams/_lib/guestHouseAd";
import { consumeGuestTranslation, hashIp } from "../app/api/dreams/_lib/guestQuota";
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


test("house ad grants one target per action, including concurrent requests and later days", async () => {
  const { db, docs } = fixture();
  const results = await Promise.all(["dream-a", "dream-b", "dream-c"].map(dream => grantGuestHouseAd("guest", "ip", "translate", dream, "ru", db)));
  assert.deepEqual(results, [true, false, false]);
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "dream-a", "es", db), false);
  assert.equal(await consumeGuestTranslation("guest", { sharedDreamId: "dream-a", targetLang: "ru" }, db), true);
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "dream-a", "ru", db), true);
  assert.equal(await grantGuestHouseAd("guest", "ip", "reading", "dream-b", undefined, db), true);
  assert.equal(await grantGuestHouseAd("guest", "ip", "reading", "dream-c", undefined, db), false);
  docs.delete(`guestQuickSymbolIp/${hashIp("ip")}_${new Date().toISOString().slice(0, 10)}`);
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "dream-b", "ru", db), false);
  assert.equal(docs.get("guestQuickSymbol/guest")?.adAnalysisCredits, undefined);
});

test("house ad caps cookie resets on the same network and preserves watched-ad grants", async () => {
  const { db, docs } = fixture();
  assert.equal(await grantGuestHouseAd("guest", "ip", "reading", "dream-a", undefined, db), true);
  assert.equal(await grantGuestHouseAd("new-cookie", "ip", "reading", "dream-a", undefined, db), false);
  docs.set("guestQuickSymbol/paid", { translationAdGrant: { sharedDreamId: "paid-dream", targetLang: "ru", expiresAtMs: Date.now() + 60_000 } });
  assert.equal(await grantGuestHouseAd("paid", "other-ip", "translate", "dream-b", "ru", db), false);
  assert.equal(docs.get("guestQuickSymbol/paid")?.yourfitTranslation, undefined);
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "../bad", "ru", db), false);
});

test("failed house-ad transaction leaves eligibility and grant untouched", async () => {
  const { db, docs } = fixture(true);
  await assert.rejects(grantGuestHouseAd("guest", "ip", "reading", "dream-a", undefined, db));
  assert.equal(docs.size, 0);
});


test("account house trials are atomic, target-bound and unavailable to subscribers", async () => {
  const { db, docs } = fixture();
  docs.set("users/alice", {});
  docs.set("users/pro", { subscriptionStatus: "active" });
  assert.equal(await grantAccountHouseAd("pro", null, "reading", "dream-a", undefined, db), false);
  const results = await Promise.all(["dream-a", "dream-b"].map(id => grantAccountHouseAd("alice", null, "translate", id, "ru", db)));
  assert.deepEqual(results, [true, false]);
  assert.equal(await grantAccountHouseAd("alice", null, "translate", "dream-a", "es", db), false);
  assert.equal(await grantAccountHouseAd("alice", null, "translate", "dream-a", "ru", db), true);
  assert.equal(await grantAccountHouseAd("alice", null, "reading", "dream-b", undefined, db), true);
  assert.equal(await grantAccountHouseAd("alice", null, "reading", "dream-c", undefined, db), false);
  assert.equal(docs.get("users/alice")?.adAnalysisCredits, undefined);
});

test("sign-in and sign-out preserve used house trials even after cookie removal", async () => {
  const { db, docs } = fixture();
  docs.set("users/alice", {});
  docs.set("guestQuickSymbol/guest", { firstAnalysisNoAd: true, yourfitTranslation: { source: "yourfit", sharedDreamId: "dream-a", targetLang: "ru" } });
  await inheritGuestHouseAds("alice", "guest", db);
  assert.equal(await grantAccountHouseAd("alice", null, "translate", "dream-b", "ru", db), false);
  assert.equal(await grantAccountHouseAd("alice", null, "analysis", undefined, undefined, db, "new dream"), false);
  assert.equal(await grantAccountHouseAd("alice", "guest", "reading", "dream-b", undefined, db), true);
  assert.equal(await grantGuestHouseAd("guest", "ip", "reading", "dream-b", undefined, db), false);
});

test("account analysis trial cannot be spent twice or on changed text; failed work is refundable and completed work recoverable", async () => {
  const { db, docs } = fixture();
  docs.set("users/alice", {});
  docs.set("users/alice/dreams/own", { text: "A quiet room" });
  const target = { dreamId: "own", text: "A quiet room", lang: "en", lens: "psychological" };
  assert.equal(await grantAccountHouseAd("alice", null, "analysis", "someone-elses-dream", undefined, db), false);
  assert.equal(await grantAccountHouseAd("alice", null, "analysis", "own", undefined, db), true);
  assert.equal(await consumeAccountHouseAnalysis("alice", { ...target, text: "another dream" }, db), false);
  assert.deepEqual(await Promise.all([consumeAccountHouseAnalysis("alice", target, db), consumeAccountHouseAnalysis("alice", target, db)]), [true, false]);
  await finishAccountHouseAnalysis("alice", null, null, db);
  assert.equal(await consumeAccountHouseAnalysis("alice", target, db), true);
  const result = { analysis: "Prepared answer", yourfitPromo: true };
  await finishAccountHouseAnalysis("alice", result, "attempt-id", db);
  assert.deepEqual(await recoverAccountHouseAnalysis("alice", target, db), { result, attemptId: "attempt-id" });
  assert.equal(await recoverAccountHouseAnalysis("alice", { ...target, lens: "spiritual" }, db), null);
  assert.equal(await recoverAccountHouseAnalysis("other-account", target, db), null);
  await finishAccountHouseAnalysis("alice", null, null, db);
  assert.equal(await consumeAccountHouseAnalysis("alice", target, db), false);
  assert.equal(await grantAccountHouseAd("alice", null, "analysis", "own", undefined, db), true);
  assert.equal(await consumeAccountHouseAnalysis("alice", target, db), false);
});

test("account home analysis trial follows the same text when saved to the journal", async () => {
  const { db, docs } = fixture();
  docs.set("users/alice", {});
  assert.equal(await grantAccountHouseAd("alice", null, "analysis", undefined, undefined, db, "A quiet room"), true);
  const target = { dreamId: "saved-after-ad", text: "A quiet room", lang: "ru", lens: "psychological" };
  assert.equal(await consumeAccountHouseAnalysis("alice", target, db), true);
  await finishAccountHouseAnalysis("alice", { analysis: "Prepared" }, "attempt-id", db);
  assert.ok(await recoverAccountHouseAnalysis("alice", { ...target, dreamId: "" }, db));
});


test("pre-ad checks cannot open guest translations or More or spend the one-time reserve", async () => {
  const { db, docs } = fixture();
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "dream-a", "ru", db, true), true);
  assert.equal(await grantGuestHouseAd("guest", "ip", "reading", "dream-a", undefined, db, true), true);
  assert.equal(docs.size, 0);
  assert.equal(await consumeGuestTranslation("guest", { sharedDreamId: "dream-a", targetLang: "ru" }, db), false);
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "dream-a", "ru", db), true);
  assert.equal(await consumeGuestTranslation("guest", { sharedDreamId: "dream-a", targetLang: "ru" }, db), true);
  assert.equal(await grantGuestHouseAd("guest", "ip", "translate", "dream-b", "ru", db, true), false);
});

test("pre-ad checks cannot open account analysis, Translate or More; grant stays after explicit completion", async () => {
  const { db, docs } = fixture();
  docs.set("users/alice", {});
  docs.set("users/alice/dreams/own", { text: "A quiet room" });
  for (const kind of ["analysis", "translate", "reading"] as const) {
    assert.equal(await grantAccountHouseAd("alice", null, kind, kind === "analysis" ? "own" : "dream-a", "ru", db, undefined, true), true);
    assert.equal(docs.has(`users/alice/houseAdGrants/${kind}`), false);
  }
  const target = { dreamId: "own", text: "A quiet room", lang: "en", lens: "psychological" };
  assert.equal(await consumeAccountHouseAnalysis("alice", target, db), false);
  assert.equal(docs.has("users/alice/translationUnlocks/__adGrant"), false);
  assert.equal(docs.has("users/alice/readingUnlocks/__adGrant"), false);
  assert.equal(await grantAccountHouseAd("alice", null, "analysis", "own", undefined, db), true);
  assert.equal(await consumeAccountHouseAnalysis("alice", target, db), true);
});
