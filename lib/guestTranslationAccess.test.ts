/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import type { Firestore } from "firebase-admin/firestore";

import { consumeGuestTranslation, guestAdReward, refundGuestTranslation } from "../app/api/dreams/_lib/guestQuota";
import { readTranslationUnlock, recordTranslationServe, translationUnlockPath } from "../app/api/dreams/_lib/translationLedger";

// Minimal in-memory Firestore: enough for the guest translate credit path
// (transactions with get/set/create, merge writes, FieldValue.increment).
function fakeDb() {
  const docs = new Map<string, Record<string, any>>();
  const apply = (path: string, data: Record<string, any>, merge: boolean) => {
    const prev = merge ? { ...(docs.get(path) ?? {}) } : {};
    for (const [k, v] of Object.entries(data)) {
      const inc = v && typeof v === "object" && typeof (v as any).isEqual === "function" ? v : null;
      if (inc) {
        if (v?.constructor?.name === "DeleteTransform") { delete prev[k]; continue; }
        // FieldValue.increment(n) — we only ever use ±1 here
        const asText = String((inc as any).operand ?? "");
        const n = Number(asText) || (JSON.stringify(inc).includes("-1") ? -1 : 1);
        prev[k] = Number(prev[k] ?? 0) + n;
      } else prev[k] = v;
    }
    docs.set(path, prev);
  };
  const ref = (path: string): any => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    set: async (data: Record<string, any>, o?: { merge?: boolean }) => apply(path, data, !!o?.merge),
  });
  const tx = {
    get: async (r: any) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
    set: (r: any, data: Record<string, any>, o?: { merge?: boolean }) => apply(r.path, data, !!o?.merge),
    create: (r: any, data: Record<string, any>) => {
      if (docs.has(r.path)) throw new Error("ALREADY_EXISTS");
      docs.set(r.path, data);
    },
  };
  const db = {
    doc: ref,
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        set: (r: any, data: Record<string, any>, o?: { merge?: boolean }) => writes.push(() => apply(r.path, data, !!o?.merge)),
        update: () => {},
        delete: (r: any) => writes.push(() => docs.delete(r.path)),
        commit: async () => writes.forEach((w) => w()),
      };
    },
  } as unknown as Firestore;
  return { db, docs };
}

const guest = "12345678-abcd-1234-abcd-123456789abc";
const ip = "192.0.2.1";
const rewardId = "9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";
const target = { sharedDreamId: "dream", targetLang: "ru" };

test("guest translation: ad opens only its selected target and is restored on failure", async () => {
  const { db, docs } = fakeDb();
  docs.set(`guestQuickSymbol/${guest}`, { adTranslateCredits: 5 });
  // Nothing watched for this target yet → cannot translate.
  assert.equal(await consumeGuestTranslation(guest, target, db), false);

  // GET status for the translate kind: no credits, 3 ads left today.
  assert.deepEqual(await guestAdReward(guest, ip, false, undefined, db, "translate"), { credits: 0, leftToday: 3 });

  // Watching an ad grants a temporary pass for this target, not a banked credit.
  const granted = await guestAdReward(guest, ip, true, rewardId, db, "translate", target);
  assert.deepEqual(granted, { credits: 1, leftToday: 2 });
  assert.equal(docs.get(`guestQuickSymbol/${guest}`)?.adTranslateCredits, 0);
  assert.equal(docs.get(`guestQuickSymbol/${guest}`)?.adAnalysisCredits, undefined);
  // Analysis status is untouched by translate ads.
  assert.deepEqual(await guestAdReward(guest, ip, false, undefined, db, "analysis"), { credits: 0, leftToday: 3 });

  // Replaying the same reward id does not grant a second credit.
  assert.deepEqual(await guestAdReward(guest, ip, true, rewardId, db, "translate", target), { credits: 1, leftToday: 2, replayed: true });

  // The pass opens exactly one translation.
  assert.equal(await consumeGuestTranslation(guest, { sharedDreamId: "other", targetLang: "ru" }, db), false);
  assert.equal(await consumeGuestTranslation(guest, target, db), true);
  assert.equal(await consumeGuestTranslation(guest, target, db), false);
  assert.equal(await consumeGuestTranslation(guest, { sharedDreamId: "dream", targetLang: "de" }, db), false);

  // A failed translation restores this target's pass.
  await refundGuestTranslation(guest, target, db);
  assert.equal(await consumeGuestTranslation(guest, target, db), true);
});

test("guest unlock lives under the guest doc and is isolated from accounts", async () => {
  const { db, docs } = fakeDb();
  const dreamRef = db.doc("shared_dreams/dream") as any;
  await recordTranslationServe({
    db, dreamRef, sharedDreamId: "dream", uid: "", guestId: guest, who: { name: "guest", email: null },
    targetLang: "ru", source: "ai", model: "translator", translation: "Сон", usedDailyFree: false, paid: false,
  });
  assert.equal(translationUnlockPath({ guestId: guest }, "dream"), `guestQuickSymbol/${guest}/translationUnlocks/dream`);
  assert.equal(await readTranslationUnlock(db, { guestId: guest }, "dream", "ru"), true);
  assert.equal(await readTranslationUnlock(db, { guestId: "other-guest" }, "dream", "ru"), false);
  assert.equal(await readTranslationUnlock(db, { uid: guest }, "dream", "ru"), false);
  assert.equal(await readTranslationUnlock(db, "alice", "dream", "ru"), false);
  // The private entry never attributes a guest serve to an account uid.
  assert.equal(docs.get("shared_dreams/dream/private/translations")?.ru?.byUid, null);
  assert.equal(docs.get("shared_dreams/dream/private/translations")?.ru?.byName, "guest");
  // Without an owner the ledger refuses to write.
  await assert.rejects(recordTranslationServe({
    db, dreamRef, sharedDreamId: "dream", uid: "", who: { name: null, email: null },
    targetLang: "de", source: "ai", model: null, translation: "Traum", usedDailyFree: false, paid: false,
  }), /uid or guestId/);
});
