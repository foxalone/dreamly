import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";

/**
 * Translation ledger.
 *
 * shared_dreams/{id} is publicly readable, so the translated text must NOT
 * live on it (anyone could read the cache without paying). It lives in
 *
 *   shared_dreams/{id}/private/translations
 *     { [lang]: { text, model, atMs, byUid, byName, byEmail,
 *                 aiCalls, cacheHits, unlockCount, lastServedAtMs, lastServedByUid, lastSource } }
 *
 * which Firestore rules expose to the admin only; users get the text through
 * POST /api/dreams/translate. The cache is shared by everyone (it only saves
 * the OpenAI call); who may *see* it is tracked per user:
 *
 *   users/{uid}/translationUnlocks/{sharedDreamId}
 *     { sharedDreamId, langs: { en: { atMs, source, usedDailyFree, paid } } }
 *
 * A user pays (daily free slot or Pro) once per dream+lang, then it is theirs
 * forever. Every paid serve is logged for the admin dashboard:
 *
 *   shared_dreams/{id}/translationEvents/{auto}
 *     { uid, name, email, lang, source: "ai" | "cache", model, usedDailyFree, paid, atMs }
 *
 * The public dream doc only carries `translatedLangs` and `translationCount`.
 *
 * Legacy: before 2026-09-21 the text sat on shared_dreams/{id}.translations.{lang}
 * (string or {text, model, atMs}). readCachedTranslation still falls back to
 * it and the first paid serve moves it into the private doc;
 * scripts/migrate-translations-private.mjs does the same in bulk.
 */

export type TranslationSource = "ai" | "cache" | "unlocked";

export type TranslationEntry = {
  text: string;
  model: string | null;
  atMs: number | null;
  byUid?: string | null;
  byName?: string | null;
  byEmail?: string | null;
  aiCalls?: number;
  cacheHits?: number;
  unlockCount?: number;
  lastServedAtMs?: number;
  lastServedByUid?: string | null;
  lastSource?: string | null;
};

export const PRIVATE_TRANSLATIONS_DOC = "private/translations";

export function privateTranslationsRef(dreamRef: DocumentReference) {
  return dreamRef.collection("private").doc("translations");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function entryFromRaw(raw: unknown): TranslationEntry | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? { text, model: null, atMs: null } : null;
  }
  if (!isRecord(raw)) return null;
  const text = String(raw.text ?? "").trim();
  if (!text) return null;
  return {
    ...(raw as Partial<TranslationEntry>),
    text,
    model: typeof raw.model === "string" ? raw.model : null,
    atMs: typeof raw.atMs === "number" ? raw.atMs : null,
  };
}

/**
 * Returns the cached translation for a language, looking first in the private
 * doc and then in the legacy public field. `legacy` tells the caller the entry
 * still has to be moved.
 */
export async function readCachedTranslation(
  dreamRef: DocumentReference,
  publicData: Record<string, unknown> | null,
  lang: string
): Promise<{ entry: TranslationEntry; legacy: boolean } | null> {
  try {
    const snap = await privateTranslationsRef(dreamRef).get();
    if (snap.exists) {
      const entry = entryFromRaw((snap.data() as any)?.[lang]);
      if (entry) return { entry, legacy: false };
    }
  } catch (e: any) {
    console.warn("private translations read failed:", e?.message ?? e);
  }
  const legacyRaw = isRecord(publicData?.translations) ? publicData!.translations[lang] : undefined;
  const entry = entryFromRaw(legacyRaw);
  return entry ? { entry, legacy: true } : null;
}

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
  /** existing entry (source === "cache") */
  cached?: { entry: TranslationEntry; legacy: boolean };
}) {
  const { db, dreamRef, sharedDreamId, uid, who, targetLang, source, model, usedDailyFree, paid } = args;
  const now = Date.now();
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const prev: Partial<TranslationEntry> = args.cached?.entry ?? {};

  const entry: TranslationEntry =
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
          text: prev.text ?? "",
          model: prev.model ?? model ?? null,
          atMs: prev.atMs ?? null,
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

  const batch = db.batch();

  batch.set(privateTranslationsRef(dreamRef), { [targetLang]: entry, updatedAtMs: now }, { merge: true });

  const publicUpdate: Record<string, unknown> = {
    translatedLangs: FieldValue.arrayUnion(targetLang),
    translationCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // Moving a legacy entry: drop the public copy of the text.
  if (args.cached?.legacy) publicUpdate[`translations.${targetLang}`] = FieldValue.delete();
  batch.update(dreamRef, publicUpdate);

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
