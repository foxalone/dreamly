import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";

import { guestDreamSnapshotId } from "../app/api/dreams/_lib/guestDreamSnapshot";
import { analysisPreview } from "./analysisPreview";
import { ensureSharedDreamAnalyses } from "./ensureSharedDreamAnalysis";
import { PUBLIC_ANALYSIS_MAX, cleanAnalysis } from "./publicDreamAnalysis";

function memoryDb(seed: Record<string, Record<string, unknown>>) {
  const docs = new Map(Object.entries(seed));
  const collection = (name: string): unknown => ({
    doc: (id: string) => ref(`${name}/${id}`),
    where: (field: string, _op: string, value: unknown) => ({
      limit: () => ({
        get: async () => ({
          docs: [...docs.entries()]
            .filter(([path, data]) => path.startsWith(`${name}/`) && !path.slice(name.length + 1).includes("/") && data[field] === value)
            .map(([path, data]) => ({ id: path.slice(name.length + 1), data: () => data })),
        }),
      }),
    }),
  });
  const ref = (path: string) => ({
    get: async () => {
      const data = docs.get(path);
      return { exists: docs.has(path), data: () => data };
    },
    update: async (patch: Record<string, unknown>) => {
      docs.set(path, { ...docs.get(path), ...patch });
    },
    set: async (value: Record<string, unknown>, options?: { merge?: boolean }) => {
      docs.set(path, options?.merge ? { ...docs.get(path), ...value } : value);
    },
    collection: (name: string) => collection(`${path}/${name}`),
  });
  return { db: { collection } as unknown as Firestore, docs };
}

test("cleanAnalysis trims and caps a public reading", () => {
  assert.equal(cleanAnalysis("  hello  "), "hello");
  assert.equal(cleanAnalysis("   "), "");
  assert.equal(cleanAnalysis(12), "");
  assert.equal(cleanAnalysis("x".repeat(PUBLIC_ANALYSIS_MAX + 5)).length, PUBLIC_ANALYSIS_MAX);
});

test("a public reading is shortened to a preview and the rest stays private", async () => {
  const full = `${"Being lost in a building after a night out can reflect a sense of disorientation and uncertainty, grounded in the image of wandering corridors and closed doors. "}${"The repeated search for the hotel or car, paired with not finding them, evokes anxiety about orientation and temporary separation from the familiar."}`;
  const { db, docs } = memoryDb({
    "shared_dreams/dream-1": { text: "Hello", analysisText: full, ownerGuestId: "guest" },
  });
  const view = analysisPreview(full);
  const result = await ensureSharedDreamAnalyses(db, ["dream-1", "bad id", 4]);
  assert.equal(result["dream-1"], view.preview);
  assert.equal(view.hasMore, true);
  assert.equal(docs.get("shared_dreams/dream-1")?.analysisText, view.preview);
  assert.equal(docs.get("shared_dreams/dream-1")?.analysisHasMore, true);
  assert.equal(docs.get("shared_dreams/dream-1/private/analysis")?.text, full.trim());
  assert.equal(String(docs.get("shared_dreams/dream-1")?.analysisText).includes("temporary separation"), false);
});

test("a guest reading is copied onto the public dream", async () => {
  const guestId = "guest";
  const text = "Lost in a building";
  const sharedId = "guest_guest_dream";
  const { db, docs } = memoryDb({
    [`shared_dreams/${sharedId}`]: { text, ownerGuestId: guestId },
    [`guest_dreams/${guestDreamSnapshotId(guestId, text)}`]: { guestId, text, analysis: "The building is the night you left." },
  });
  const result = await ensureSharedDreamAnalyses(db, [sharedId]);
  assert.equal(result[sharedId], "The building is the night you left.");
  assert.equal(docs.get(`shared_dreams/${sharedId}`)?.analysisHasMore, false);
  assert.equal(docs.get(`shared_dreams/${sharedId}/private/analysis`)?.text, "The building is the night you left.");
});

test("a signed-in journal reading is copied, and a story is not", async () => {
  const { db, docs } = memoryDb({
    "shared_dreams/uid_d1": { text: "A road", ownerUid: "uid", ownerDreamId: "d1", sourceType: "dream" },
    "users/uid/dreams/d1": { analysisText: "The road is a choice." },
    "shared_dreams/uid_story_s1": { text: "A story", ownerUid: "uid", ownerDreamId: "s1", sourceType: "story" },
    "users/uid/dreams/s1": { analysisText: "Should stay private." },
  });
  const result = await ensureSharedDreamAnalyses(db, ["uid_d1", "uid_story_s1"]);
  assert.equal(result.uid_d1, "The road is a choice.");
  assert.equal(result.uid_story_s1, undefined);
  assert.equal(docs.get("shared_dreams/uid_story_s1")?.analysisText, undefined);
});

test("sharedId finds the guest reading when the snapshot text no longer matches, and another guest is ignored", async () => {
  const { db } = memoryDb({
    "shared_dreams/public-1": { text: "Public wording", ownerGuestId: "guest-a" },
    "guest_dreams/other": { guestId: "guest-b", sharedId: "public-1", analysis: "Someone else's reading" },
    "guest_dreams/mine": { guestId: "guest-a", sharedId: "public-1", analysis: "The reading this guest received", text: "Original wording" },
  });
  const result = await ensureSharedDreamAnalyses(db, ["public-1", "missing"]);
  assert.deepEqual(result, { "public-1": "The reading this guest received" });
});

test("a deleted public dream does not publish its reading", async () => {
  const guestId = "guest";
  const text = "Gone";
  const { db, docs } = memoryDb({
    "shared_dreams/gone": { text, ownerGuestId: guestId, deleted: true },
    [`guest_dreams/${guestDreamSnapshotId(guestId, text)}`]: { guestId, text, analysis: "Private" },
  });
  const result = await ensureSharedDreamAnalyses(db, ["gone"]);
  assert.deepEqual(result, {});
  assert.equal(docs.get("shared_dreams/gone")?.analysisText, undefined);
});
