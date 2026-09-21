import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { DREAMS_PER_DAY, FREE_DREAM_SAVES_TOTAL } from "@/lib/subscriptions/plans";
import { hasPaidAccess, utcDayKey } from "@/lib/subscriptions/status";

export { DREAM_MAX_CHARS, DREAMS_PER_DAY } from "@/lib/subscriptions/plans";

type AccessOk = {
  uid: string;
  remaining: number;
  used: number;
  dayKey: string;
  /** True when this slot was the non-subscriber's free first save (no daily counter touched). */
  free?: boolean;
};

type ConsumeOpts = {
  /**
   * Let a signed-in user without a subscription take the slot if they still
   * have one of FREE_DREAM_SAVES_TOTAL lifetime free saves. Only the diary
   * Save path (/api/dreams/consume-slot) passes this; AI analysis never does.
   */
  allowFreeSave?: boolean;
};

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

export async function requirePaidAccess(uid: string): Promise<{ error: NextResponse } | { uid: string }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  const snap = await adminDb().collection("users").doc(uid).get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
  if (!hasPaidAccess(data)) {
    return {
      error: jsonError("A Dreamly subscription is required.", "SUBSCRIPTION_REQUIRED", 402),
    };
  }
  return { uid };
}

export async function consumeDreamSlot(
  uid: string,
  opts: ConsumeOpts = {}
): Promise<AccessOk | { error: NextResponse }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  if (!opts.allowFreeSave) {
    const access = await requirePaidAccess(uid);
    if ("error" in access) return access;
  }

  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const dayKey = utcDayKey();

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      if (!hasPaidAccess(data)) {
        if (!opts.allowFreeSave) throw new Error("SUBSCRIPTION_REQUIRED");
        const freeUsedRaw = Number(data.freeDreamSavesUsed ?? 0);
        const freeUsed = Number.isFinite(freeUsedRaw) ? Math.max(0, Math.floor(freeUsedRaw)) : 0;
        if (freeUsed >= FREE_DREAM_SAVES_TOTAL) throw new Error("SUBSCRIPTION_REQUIRED");
        tx.set(
          userRef,
          {
            freeDreamSavesUsed: freeUsed + 1,
            freeDreamSaveAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return { uid, used: 0, remaining: 0, dayKey, free: true };
      }
      const used = String(data.dreamsDayKey ?? "") === dayKey ? Number(data.dreamsTodayCount ?? 0) : 0;
      const current = Number.isFinite(used) ? Math.max(0, Math.floor(used)) : 0;
      if (current >= DREAMS_PER_DAY) {
        throw new Error("DAILY_LIMIT");
      }
      const next = current + 1;
      tx.set(
        userRef,
        {
          dreamsDayKey: dayKey,
          dreamsTodayCount: next,
          dreamsSlotUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { uid, used: next, remaining: Math.max(0, DREAMS_PER_DAY - next), dayKey };
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message === "SUBSCRIPTION_REQUIRED") {
      return { error: jsonError("A Dreamly subscription is required.", "SUBSCRIPTION_REQUIRED", 402) };
    }
    if (message === "DAILY_LIMIT") {
      return {
        error: jsonError(`Daily limit reached (${DREAMS_PER_DAY} dreams). Try again tomorrow.`, "DAILY_LIMIT", 429),
      };
    }
    throw e;
  }
}

export async function refundDreamSlot(uid: string) {
  if (!uid) return;
  try {
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const dayKey = utcDayKey();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      if (String(data.dreamsDayKey ?? "") !== dayKey) return;
      const used = Number(data.dreamsTodayCount ?? 0);
      if (!Number.isFinite(used) || used <= 0) return;
      tx.set(
        userRef,
        {
          dreamsTodayCount: Math.max(0, Math.floor(used) - 1),
          dreamsSlotUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (e) {
    console.warn("refundDreamSlot failed:", e);
  }
}
