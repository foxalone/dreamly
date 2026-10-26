import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";
import { guestDreamSnapshotId, saveGuestDreamSnapshot } from "../app/api/dreams/_lib/guestDreamSnapshot";

function fixture() {
  const rows = new Map<string, Record<string, unknown>>();
  const db = {
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async (run: (tx: unknown) => Promise<void>) => run({
      get: async (ref: { id: string }) => ({ exists: rows.has(ref.id) }),
      set: (ref: { id: string }, value: Record<string, unknown>) => rows.set(ref.id, { ...rows.get(ref.id), ...value }),
    }),
  } as unknown as Firestore;
  return { db, rows };
}
const reading = {
  guestId: "test-guest", text: "A quiet room", analysis: "A reflection", model: "test-model",
  lens: "psychological", lang: "en", emojis: [{ native: "🏠" }], createdAtMs: 1_792_994_000_000,
};

test("successful guest readings are saved without a map city, separately for each dream", async () => {
  const { db, rows } = fixture();
  const first = await saveGuestDreamSnapshot(reading, db);
  const second = await saveGuestDreamSnapshot({ ...reading, text: "A different dream" }, db);
  assert.notEqual(first, second);
  assert.equal(rows.size, 2);
  assert.equal(rows.get(first)?.analysis, reading.analysis);
  assert.equal(rows.get(first)?.analysisModel, reading.model);
  assert.equal(rows.get(first)?.createdAtMs, reading.createdAtMs);
  assert.equal(rows.get(first)?.cityId, undefined);
  assert.equal(guestDreamSnapshotId(reading.guestId, ` ${reading.text} `), first);
});

test("re-analysis preserves sharing, deletion, import and map history", async () => {
  const { db, rows } = fixture();
  const id = await saveGuestDreamSnapshot(reading, db);
  rows.set(id, { ...rows.get(id), shared: true, sharedId: "feed-id", deleted: true,
    imported: true, importedUid: "account", cityId: "city", mapIngestId: "map-id" });
  await saveGuestDreamSnapshot({ ...reading, analysis: "New reading", createdAtMs: reading.createdAtMs + 1000 }, db);
  const saved = rows.get(id)!;
  assert.equal(saved.analysis, "New reading");
  assert.equal(saved.createdAtMs, reading.createdAtMs);
  assert.equal(saved.analysisAtMs, reading.createdAtMs + 1000);
  for (const [key, value] of Object.entries({ shared: true, sharedId: "feed-id", deleted: true,
    imported: true, importedUid: "account", cityId: "city", mapIngestId: "map-id" })) {
    assert.equal(saved[key], value);
  }
  assert.equal(rows.size, 1);
});
