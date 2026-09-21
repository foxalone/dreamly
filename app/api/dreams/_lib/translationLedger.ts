import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";

/**
 * Translation ledger.
 *
 * Text cache lives on shared_dreams/{id}.translations.{lang} and is shared by
 * everyone — it only saves the OpenAI call. Who is allowed to *see* it is
 * tracked per user:
 *
 *   users/{uid}/translationUnlocks/{sharedDreamId}
 *     { sharedDreamId, langs: { en: { atMs, source, usedDailyFree, paid } } }
 *
 * A user pays (daily free slot or Pro) once per dream+lang, then it is theirs
 * forever. Every paid serve is also logged for the admin dashboard:
 *
 *   shared_dreams/{id}/translationEvents/{auto}
 *     { uid, name, email, lang, source: "ai" | "cache", model, usedDailyFree, paid, atMs }
 *
 * and summarised on the dream itself:
 *
 *   shared_dreams/{id}.translations.{lang}
 *     { text, model, atMs, byUid, byName, byEmail, aiCalls, cacheHits, unlockCount, lastServedAtMs, lastServedByUid }
 */

export type TranslationSource = "ai" | "cache" | "unlocked";

export async function readTranslationUnlock(
  uid: string,
  sharedDreamId: string,
  lang: string
): Promise<boolean> {
  if (!uid || !sharedDreamId) return false;
  try {
    const { adminDb } = await import("../../admin/_lib/firebaseAdmin");
    const snap = await adminDb().doc(`users/${uid}/translationUnlocks/${sharedDreamId}`).get();
    if (!snap.exists) return false;
    const langs = (snap.data() as any)?.langs;
    return !!(langs && typeof langs === "object" && langs[lang]);
  } catch (e: any) {
    console.warn("readTranslationUnlock failed:", e?.message ?? e);
    return false;
  }
}

export async function recordTranslationServe(args: {
  db: Firestore;
  dreamRef: DocumentReference;
  sharedDreamId: string;
  uid: string;
  who: { name: string | null; email: string | null };
  targetLang: string;
  source: "ai" | "cache";
  model: string | null;
  usedDailyFree: boolean;
  paid: boolean;
  /** fresh OpenAI output (source === "ai") */
  translation?: string;
  /** existing translations.{lang} entry (source === "cache") */
  cachedEntry?: Record<string, unknown>;
}) {
  const { db, dreamRef, sharedDreamId, uid, who, targetLang, source, model, usedDailyFree, paid } = args;
  const now = Date.now();

  const prev: Record<string, unknown> = args.cachedEntry ?? {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  const entry: Record<string, unknown> =
    source === "ai"
      ? {
          text: args.translation ?? "",
          model,
          atMs: now,
          byUid: uid,
          byName: who.name,
          byEmail: who.email,
          aiCalls: num(prev.aiCalls) + 1,
          cacheHits: num(prev.cacheHits),
          unlockCount: num(prev.unlockCount) + 1,
          lastServedAtMs: now,
          lastServedByUid: uid,
          lastSource: "ai",
        }
      : {
          ...prev,
          model: prev.model ?? model ?? null,
          byUid: prev.byUid ?? null,
          byName: prev.byName ?? null,
          byEmail: prev.byEmail ?? null,
          aiCalls: num(prev.aiCalls) || 1, // the text exists, so at least one call was made
          cacheHits: num(prev.cacheHits) + 1,
          unlockCount: num(prev.unlockCount) + 1,
          lastServedAtMs: now,
          lastServedByUid: uid,
          lastSource: "cache",
        };
  delete entry.legacy; // the whole map is rewritten, so the synthetic marker must not persist

  const batch = db.batch();

  batch.update(dreamRef, {
    [`translations.${targetLang}`]: entry,
    translationCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(dreamRef.collection("translationEvents").doc(), {
    uid,
    name: who.name,
    email: who.email,
    lang: targetLang,
    source,
    model: model ?? null,
    usedDailyFree,
    paid,
    atMs: now,
    createdAt: FieldValue.serverTimestamp(),
  });

  batch.set(
    db.doc(`users/${uid}/translationUnlocks/${sharedDreamId}`),
    {
      sharedDreamId,
      updatedAtMs: now,
      langs: {
        [targetLang]: { atMs: now, source, usedDailyFree, paid },
      },
    },
    { merge: true }
  );

  try {
    await batch.commit();
  } catch (e: any) {
    // Never fail the request because bookkeeping failed — the user already paid.
    console.warn("recordTranslationServe failed:", e?.message ?? e);
  }
}
