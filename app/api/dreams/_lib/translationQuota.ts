import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { FREE_TRANSLATIONS_PER_DAY } from "@/lib/subscriptions/plans";
import { hasPaidAccess, utcDayKey } from "@/lib/subscriptions/status";
import { matchingTranslationAdGrant, TRANSLATION_AD_GRANT_MS, type TranslationAdTarget } from "@/lib/translationAdGrant";

/**
 * Translation access model:
 *  - Subscribers ("Pro" = trial / active / cancelled-with-time-left): unlimited.
 *  - Everyone else who is signed in: FREE_TRANSLATIONS_PER_DAY fresh translations
 *    per UTC day, tracked on users/{uid} (translateDayKey / translateFreeCount).
 *  - Cache hits (shared_dreams.translations.<lang>) go through this code too:
 *    the cache saves the OpenAI call, not the charge. Only a user who already
 *    unlocked that dream+lang (users/{uid}/translationUnlocks) skips it — see
 *    translationLedger.ts.
 *  - A rewarded ad grants a short-lived pass for exactly one dream+language.
 *    Legacy adTranslateCredits are ignored; translations cannot be banked.
 *
 * Over the limit → 402 SUBSCRIPTION_REQUIRED with reason FREE_TRANSLATION_USED,
 * so the client can open the plans modal instead of a plain error.
 */

export type TranslationAccess =
  | { ok: true; paid: true; usedDailyFree: false; usedAdGrant: false }
  | { ok: true; paid: false; usedDailyFree: true; usedAdGrant: false }
  | { ok: true; paid: false; usedDailyFree: false; usedAdGrant: true }
  | { error: NextResponse };

function limitError() {
  return NextResponse.json(
    {
      error: "A Dreamly subscription is required.",
      code: "SUBSCRIPTION_REQUIRED",
      reason: "FREE_TRANSLATION_USED",
      freePerDay: FREE_TRANSLATIONS_PER_DAY,
    },
    { status: 402 }
  );
}

export async function consumeTranslationAccess(uid: string, target: TranslationAdTarget, database?: Firestore): Promise<TranslationAccess> {
  if (!uid) {
    return {
      error: NextResponse.json({ error: "Sign in required.", code: "AUTH_REQUIRED" }, { status: 401 }),
    };
  }

  const db = database ?? adminDb();
  const userRef = db.collection("users").doc(uid);
  const translationGrantRef = userRef.collection("translationUnlocks").doc("__adGrant");
  const dayKey = utcDayKey();

  try {
    return await db.runTransaction(async (tx): Promise<TranslationAccess> => {
      const snap = await tx.get(userRef);
      const grant = await tx.get(translationGrantRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};

      if (hasPaidAccess(data)) {
        return { ok: true, paid: true, usedDailyFree: false, usedAdGrant: false };
      }

      const sameDay = String(data.translateDayKey ?? "") === dayKey;
      const usedRaw = sameDay ? Number(data.translateFreeCount ?? 0) : 0;
      const used = Number.isFinite(usedRaw) ? Math.max(0, Math.floor(usedRaw)) : 0;
      if (used >= FREE_TRANSLATIONS_PER_DAY) {
        // An ad opens only the dream and language it was watched for.
        if (matchingTranslationAdGrant(grant.data(), target)) {
          tx.delete(translationGrantRef);
          return { ok: true, paid: false, usedDailyFree: false, usedAdGrant: true };
        }
        throw new Error("FREE_TRANSLATION_USED");
      }

      tx.set(
        userRef,
        {
          translateDayKey: dayKey,
          translateFreeCount: used + 1,
          translateFreeUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true, paid: false, usedDailyFree: true, usedAdGrant: false };
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message === "FREE_TRANSLATION_USED") {
      return { error: limitError() };
    }
    throw e;
  }
}

/** Give the free slot back when the translation itself failed (OpenAI error etc.). */
export async function refundFreeTranslation(uid: string) {
  if (!uid) return;
  try {
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const dayKey = utcDayKey();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      if (String(data.translateDayKey ?? "") !== dayKey) return;
      const used = Number(data.translateFreeCount ?? 0);
      if (!Number.isFinite(used) || used <= 0) return;
      tx.set(
        userRef,
        {
          translateFreeCount: Math.max(0, Math.floor(used) - 1),
          translateFreeUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (e) {
    console.warn("refundFreeTranslation failed:", e);
  }
}

/** Restore this target's pass when the translation itself failed. */
export async function refundAdTranslateGrant(uid: string, target: TranslationAdTarget) {
  if (!uid) return;
  try {
    const db = adminDb();
    const ref = db.collection("users").doc(uid).collection("translationUnlocks").doc("__adGrant");
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists && Number(snap.data()?.expiresAtMs ?? 0) > Date.now()) return;
      tx.set(ref, { ...target, expiresAtMs: Date.now() + TRANSLATION_AD_GRANT_MS });
    });
  } catch (e) {
    console.warn("refundAdTranslateGrant failed:", e);
  }
}
