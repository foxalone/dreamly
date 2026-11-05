import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { dailyDraw, pickDailyCard } from "./dailyDraw";
import { claimTarotDiscovery } from "./discoveries";

function memoryDb(values = new Map<string, Record<string, unknown>>()): Firestore {
  const ref = (path: string) => ({
    path,
    collection(name: string) { return ref(`${path}/${name}`); },
    doc(name: string) { return ref(`${path}/${name}`); },
  });
  return {
    collection: (name: string) => ref(name),
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => {
      const pending: Array<() => void> = [];
      const result = await work({
        get: async (document: { path: string }) => ({ exists: values.has(document.path), data: () => values.get(document.path) }),
        create: (document: { path: string }, data: Record<string, unknown>) => pending.push(() => values.set(document.path, data)),
        set: (document: { path: string }, data: Record<string, unknown>) => pending.push(() => values.set(document.path, data)),
      });
      pending.forEach(write => write());
      return result;
    },
  } as unknown as Firestore;
}

test("a saved account card wins over browser and IP cards", () => {
  assert.equal(pickDailyCard(["magician", "moon", "sun"], () => 0), "magician");
});

test("a browser card wins when the IP changes or conflicts", () => {
  assert.equal(pickDailyCard([undefined, "star", "tower"], () => 0), "star");
});

test("an IP card is reused for a new browser on the same network", () => {
  assert.equal(pickDailyCard([undefined, undefined, "hermit"], () => 0), "hermit");
});

test("invalid saved values cannot choose an unapproved card", () => {
  assert.equal(pickDailyCard(["unknown", null], () => 0), "fool");
  assert.throws(() => pickDailyCard([], () => 22));
});

test("same guest, account and IP keep one card until the UTC day changes", async () => {
  const db = memoryDb();
  const today = new Date("2026-11-05T09:00:00Z");
  const first = await dailyDraw(db, { uid: null, guestId: "guest-a", ipBucket: "ip-a" }, "secret", today, () => 3);
  assert.deepEqual(first, { day: "2026-11-05", cardId: "empress" });
  assert.equal((await dailyDraw(db, { uid: null, guestId: "guest-b", ipBucket: "ip-a" }, "secret", today, () => 8)).cardId, "empress");
  assert.equal((await dailyDraw(db, { uid: null, guestId: "guest-a", ipBucket: "ip-b" }, "secret", today, () => 8)).cardId, "empress");
  assert.equal((await dailyDraw(db, { uid: "user-a", guestId: "guest-a", ipBucket: "ip-b" }, "secret", today, () => 8)).cardId, "empress");
  assert.equal((await dailyDraw(db, { uid: "user-a", guestId: "guest-c", ipBucket: "ip-c" }, "secret", today, () => 8)).cardId, "empress");
  const tomorrow = await dailyDraw(db, { uid: "user-a", guestId: "guest-c", ipBucket: "ip-c" }, "secret", new Date("2026-11-06T00:01:00Z"), () => 8);
  assert.deepEqual(tomorrow, { day: "2026-11-06", cardId: "strength" });
});

test("revealed account cards are saved once per UTC day and repeats increase the count", async () => {
  const values = new Map<string, Record<string, unknown>>();
  const db = memoryDb(values);
  const today = new Date("2026-11-05T09:00:00Z");
  await dailyDraw(db, { uid: "user-a", guestId: "guest-a", ipBucket: null }, "secret", today, () => 3);
  await dailyDraw(db, { uid: "user-a", guestId: "guest-a", ipBucket: null }, "secret", today, () => 8);
  assert.deepEqual(values.get("users/user-a/tarotCards/2026-11-05_empress"), {
    day: "2026-11-05", cardId: "empress", discoveredAtMs: today.getTime(),
  });
  assert.deepEqual(values.get("users/user-a/tarotCardCounts/empress"), { cardId: "empress", count: 1, lastDay: "2026-11-05" });
  assert.equal([...values.keys()].filter(key => key.startsWith("users/user-a/tarotCards/")).length, 1);
  await claimTarotDiscovery(db, "user-a", "2026-11-05", "empress", today.getTime() + 1000);
  assert.equal(values.get("users/user-a/tarotCards/2026-11-05_empress")?.discoveredAtMs, today.getTime());
  assert.equal(values.get("users/user-a/tarotCardCounts/empress")?.count, 1);
  await dailyDraw(db, { uid: "user-a", guestId: "guest-a", ipBucket: null }, "secret", new Date("2026-11-06T09:00:00Z"), () => 8);
  assert.equal([...values.keys()].filter(key => key.startsWith("users/user-a/tarotCards/")).length, 2);
  await dailyDraw(db, { uid: "user-a", guestId: "guest-a", ipBucket: null }, "secret", new Date("2026-11-07T09:00:00Z"), () => 3);
  assert.deepEqual(values.get("users/user-a/tarotCardCounts/empress"), { cardId: "empress", count: 2, lastDay: "2026-11-07" });
});

test("a guest card can be claimed once when the visitor signs in", async () => {
  const values = new Map<string, Record<string, unknown>>();
  const db = memoryDb(values);
  await claimTarotDiscovery(db, "user-b", "2026-11-05", "moon", 123);
  await claimTarotDiscovery(db, "user-b", "2026-11-05", "moon", 456);
  assert.deepEqual(values.get("users/user-b/tarotCards/2026-11-05_moon"), { day: "2026-11-05", cardId: "moon", discoveredAtMs: 123 });
  assert.deepEqual(values.get("users/user-b/tarotCardCounts/moon"), { cardId: "moon", count: 1, lastDay: "2026-11-05" });
});
