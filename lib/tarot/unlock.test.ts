import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { completeTarotAd, openTarotReading, startTarotAd, tarotAccessInfo, tarotSubject } from "./unlock";

function database(initial: Record<string, Record<string, unknown>> = {}) {
  const docs = new Map<string, Record<string, unknown>>(Object.entries(structuredClone(initial)));
  const snapshot = (path: string) => ({ exists: docs.has(path), data: () => docs.get(path) });
  let queue = Promise.resolve();
  const db = {
    doc: (path: string) => ({ path, get: async () => snapshot(path), create: async (data: Record<string, unknown>) => {
      if (docs.has(path)) throw new Error("already exists");
      docs.set(path, data);
    } }),
    runTransaction: <T>(work: (tx: unknown) => Promise<T>) => {
      const result = queue.then(async () => {
        const writes: Array<() => void> = [];
        const value = await work({
          get: async (ref: { path: string }) => { assert.equal(writes.length, 0); return snapshot(ref.path); },
          set: (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => writes.push(() => docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data)),
          create: (ref: { path: string }, data: Record<string, unknown>) => writes.push(() => { if (docs.has(ref.path)) throw new Error("already exists"); docs.set(ref.path, data); }),
        });
        writes.forEach(write => write());
        return value;
      });
      queue = result.then(() => {}, () => {});
      return result;
    },
  };
  return { db: db as unknown as Firestore, docs };
}

const day = "2026-11-05", tomorrow = "2026-11-06";
const time = Date.parse("2026-11-05T12:00:00Z");

test("a member receives one first-ever free tarot reading, with free repeat opens that day", async () => {
  const store = database(), actor = { uid: "member" }, deps = { db: store.db, now: () => time };
  assert.equal((await tarotAccessInfo(actor, "browser", day, "fool", deps)).firstFreeAvailable, true);
  assert.equal((await openTarotReading(actor, "browser", day, "fool", deps)).source, "first_free");
  assert.equal((await openTarotReading(actor, "browser", day, "fool", deps)).source, "existing");
  assert.equal((await tarotAccessInfo(actor, "browser", day, "fool", deps)).unlocked, true);
  assert.equal((await tarotAccessInfo(actor, "browser", day, "fool", deps)).firstFreeAvailable, false);
  assert.equal(store.docs.has(`tarot_first_free/${tarotSubject(actor)}`), true);
  await assert.rejects(openTarotReading(actor, "browser", tomorrow, "sun", { db: store.db, now: () => time + 86_400_000 }), { status: 402, code: "AD_REQUIRED" });
});

test("a guest needs a completed ad, while a subscriber can read on successive days", async () => {
  const store = database({ "users/paid": { subscriptionStatus: "active" } }), deps = { db: store.db, now: () => time };
  await assert.rejects(openTarotReading({ guestId: "guest" }, "guest", day, "moon", deps), { status: 402 });
  assert.equal((await openTarotReading({ uid: "paid" }, "browser", day, "moon", deps)).source, "subscription");
  assert.equal((await openTarotReading({ uid: "paid" }, "browser", tomorrow, "sun", { db: store.db, now: () => time + 86_400_000 })).source, "subscription");
});

test("an ad challenge opens only its card for that browser and may be safely retried", async () => {
  const store = database(), guest = { guestId: "g" }, deps = { db: store.db, now: () => time };
  const { challenge } = await startTarotAd(guest, "g", day, "priestess", "network", deps);
  assert.equal((await tarotAccessInfo(guest, "g", day, "priestess", deps)).unlocked, false);
  await assert.rejects(completeTarotAd({ guestId: "other" }, "other", challenge, deps), { status: 403 });
  await Promise.all(Array.from({ length: 3 }, () => completeTarotAd(guest, "g", challenge, deps)));
  assert.equal((await tarotAccessInfo(guest, "g", day, "priestess", deps)).unlocked, true);
  assert.equal((await tarotAccessInfo(guest, "g", day, "fool", deps)).unlocked, false);
  await assert.rejects(startTarotAd(guest, "g", day, "priestess", "network", deps), { status: 409 });
  assert.equal((await tarotAccessInfo({ uid: "member" }, "g", day, "priestess", deps)).unlocked, true);
  assert.equal((await tarotAccessInfo({ uid: "member" }, "g", day, "priestess", deps)).firstFreeAvailable, true);
});
