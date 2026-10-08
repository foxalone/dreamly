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
 * forever. Guests (no account, identified by the dreamly_guest cookie) pay
 * with an ad credit and get the same permanent unlock under
 *
 *   guestQuickSymbol/{guestId}/translationUnlocks/{sharedDreamId}
 *
 * which POST /api/dreams/claim-guest-translations moves into the account the
 * first time that browser signs in. Every paid serve is logged for the admin
 * dashboard:
 *
 *   shared_dreams/{id}/translationEvents/{auto}
 *     { uid, guestId, name, email, lang, source: "ai" | "cache", model, usedDailyFree, paid, atMs }
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
  const snap = await privateTranslationsRef(dreamRef).get();
  if (snap.exists) {
    const entry = entryFromRaw((snap.data() as any)?.[lang]);
    if (entry) return { entry, legacy: false };
  }
  const legacyRaw = isRecord(publicData?.translations) ? publicData!.translations[lang] : undefined;
  const entry = entryFromRaw(legacyRaw);
  return entry ? { entry, legacy: true } : null;
}

/** Who unlocked a translation: a signed-in user or an anonymous guest (cookie). */
export type TranslationOwner = { uid: string; guestId?: undefined } | { guestId: string; uid?: undefined };

export function translationUnlockPath(owner: TranslationOwner, sharedDreamId: string) {
  return owner.uid
    ? `users/${owner.uid}/translationUnlocks/${sharedDreamId}`
    : `guestQuickSymbol/${owner.guestId}/translationUnlocks/${sharedDreamId}`;
}

function toOwner(owner: string | TranslationOwner): TranslationOwner | null {
  if (typeof owner === "string") return owner ? { uid: owner } : null;
  if (owner.uid) return { uid: owner.uid };
  if (owner.guestId) return { guestId: owner.guestId };
  return null;
}

export async function readTranslationUnlock(
  db: Firestore,
  owner: string | TranslationOwner,
  sharedDreamId: string,
  lang: string
): Promise<boolean> {
  const who = toOwner(owner);
  if (!who || !sharedDreamId) return false;
  // A failed read must not turn existing access into a new charge.
  const snap = await db.doc(translationUnlockPath(who, sharedDreamId)).get();
  if (!snap.exists) return false;
  const langs = (snap.data() as any)?.langs;
  return !!(langs && typeof langs === "object" && langs[lang]);
}

export async function recordTranslationServe(args: {
  db: Firestore;
  dreamRef: DocumentReference;
  sharedDreamId: string;
  /** signed-in user; empty for a guest (then `guestId` is required) */
  uid: string;
  guestId?: string;
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
  const guestId = uid ? undefined : String(args.guestId ?? "").trim();
  if (!uid && !guestId) throw new Error("recordTranslationServe: uid or guestId required");
  const owner: TranslationOwner = uid ? { uid } : { guestId: guestId! };
  // Ledger fields that identify the payer: uid for accounts, null for guests
  // (the admin shows the guestId from the event instead).
  const payerUid = uid || null;
  const now = Date.now();
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const prev: Partial<TranslationEntry> = args.cached?.entry ?? {};

  const entry: TranslationEntry =
    source === "ai"
      ? {
          text: args.translation ?? "",
          model,
          atMs: now,
          byUid: payerUid,
          byName: who.name,
          byEmail: who.email,
          aiCalls: num(prev.aiCalls) + 1,
          cacheHits: num(prev.cacheHits),
          unlockCount: num(prev.unlockCount) + 1,
          lastServedAtMs: now,
          lastServedByUid: payerUid,
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
          lastServedByUid: payerUid,
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
    uid: payerUid,
    guestId: guestId ?? null,
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
    db.doc(translationUnlockPath(owner, sharedDreamId)),
    {
      sharedDreamId,
      updatedAtMs: now,
      langs: {
        [targetLang]: { atMs: now, source, usedDailyFree, paid },
      },
    },
    { merge: true }
  );

  // Text and permanent access must both be durable before reporting success.
  // The caller refunds the consumed allowance if this atomic write fails.
  await batch.commit();
}
