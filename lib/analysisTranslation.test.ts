import assert from "node:assert/strict";
import test from "node:test";

import { analysisTranslationTargetId } from "./analysisTranslation";
import { matchingTranslationAdGrant, translationAdTarget } from "./translationAdGrant";
import { canReadFullAnalysis } from "./analysisTranslationAccess";
import type { Firestore } from "firebase-admin/firestore";

test("an analysis ad pass cannot unlock the dream text translation", () => {
  const analysis = translationAdTarget(analysisTranslationTargetId("dream-123"), "ru");
  const dreamText = translationAdTarget("dream-123", "ru");
  assert.ok(analysis);
  assert.ok(dreamText);
  const grant = { ...analysis, expiresAtMs: Date.now() + 60_000 };
  assert.equal(matchingTranslationAdGrant(grant, analysis), true);
  assert.equal(matchingTranslationAdGrant(grant, dreamText), false);
});

test("full analysis translation requires the reading's existing access", async () => {
  const records = new Map<string, Record<string, unknown>>();
  const db = {
    doc: (path: string) => ({ get: async () => ({ exists: records.has(path), data: () => records.get(path) }) }),
  } as unknown as Firestore;
  const full = (uid: string | null, guestId: string | null, owner: Record<string, unknown> = {}) =>
    canReadFullAnalysis(db, "dream-123", owner, uid, guestId);

  assert.equal(await full("stranger", null), false);
  assert.equal(await full("author", null, { ownerUid: "author" }), true);
  assert.equal(await full(null, "guest", { ownerGuestId: "guest" }), true);
  // A reading unlock alone is enough even without a paid subscription.
  records.set("users/reader/readingUnlocks/dream-123", {});
  records.set("guestQuickSymbol/visitor/readingUnlocks/dream-123", {});
  assert.equal(await full("reader", null), true);
  assert.equal(await full(null, "visitor"), true);
});
