import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { DREAMS_PER_DAY, FREE_DREAM_SAVES_PER_DAY, FREE_DREAM_SAVES_TOTAL } from "@/lib/subscriptions/plans";
import { hasPaidAccess, utcDayKey } from "@/lib/subscriptions/status";

export { DREAM_MAX_CHARS, DREAMS_PER_DAY } from "@/lib/subscriptions/plans";

type AccessOk = {
  uid: string;
  remaining: number;
  used: number;
  dayKey: string;
  /** True when this slot was one of the non-subscriber's free saves (subscriber daily counter untouched). */
  free?: boolean;
};

type ConsumeOpts = {
  /**
   * Let a signed-in user without a subscription take the slot if they still
   * have one of FREE_DREAM_SAVES_TOTAL lifetime free saves and have not taken
   * FREE_DREAM_SAVES_PER_DAY of them today (UTC). Only the diary
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

/** Firestore fields of one free quota (saves or AI analyses) on users/{uid}. */
const FREE_QUOTA_FIELDS = {
  save: {
    total: "freeDreamSavesUsed",
    dayKey: "freeDreamSaveDayKey",
    today: "freeDreamSavesTodayCount",
    at: "freeDreamSaveAt",
  },
  analysis: {
    total: "freeAnalysesUsed",
    dayKey: "freeAnalysisDayKey",
    today: "freeAnalysesTodayCount",
    at: "freeAnalysisAt",
  },
} as const;
type FreeQuotaKind = keyof typeof FREE_QUOTA_FIELDS;

function toCount(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * Inside a transaction: take one free unit for a non-subscriber —
 * FREE_DREAM_SAVES_TOTAL in total and FREE_DREAM_SAVES_PER_DAY per UTC day,
 * counted separately for saves and for AI analyses. Throws
 * SUBSCRIPTION_REQUIRED (lifetime limit) or FREE_DAILY_LIMIT.
 */
function takeFreeUnit(
  tx: Transaction,
  userRef: DocumentReference,
  data: Record<string, unknown>,
  kind: FreeQuotaKind,
  dayKey: string
) {
  const f = FREE_QUOTA_FIELDS[kind];
  const used = toCount(data[f.total]);
  if (used >= FREE_DREAM_SAVES_TOTAL) throw new Error("SUBSCRIPTION_REQUIRED");
  const today = String(data[f.dayKey] ?? "") === dayKey ? toCount(data[f.today]) : 0;
  if (today >= FREE_DREAM_SAVES_PER_DAY) throw new Error("FREE_DAILY_LIMIT");
  tx.set(
    userRef,
    {
      [f.total]: used + 1,
      [f.dayKey]: dayKey,
      [f.today]: today + 1,
      [f.at]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

function quotaError(e: unknown): { error: NextResponse } {
  const message = e instanceof Error ? e.message : "";
  if (message === "SUBSCRIPTION_REQUIRED") {
    return { error: jsonError("A Dreamly subscription is required.", "SUBSCRIPTION_REQUIRED", 402) };
  }
  if (message === "FREE_DAILY_LIMIT") {
    return {
      error: jsonError("Free plan: one dream a day. Subscribe or try again tomorrow.", "FREE_DAILY_LIMIT", 402),
    };
  }
  if (message === "DAILY_LIMIT") {
    return {
      error: jsonError(`Daily limit reached (${DREAMS_PER_DAY} dreams). Try again tomorrow.`, "DAILY_LIMIT", 429),
    };
  }
  throw e;
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
        takeFreeUnit(tx, userRef, data, "save", dayKey);
        return { uid, used: 0, remaining: 0, dayKey, free: true };
      }
      const current = String(data.dreamsDayKey ?? "") === dayKey ? toCount(data.dreamsTodayCount) : 0;
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
    return quotaError(e);
  }
}

/**
 * Access check for an AI analysis by a signed-in user.
 * - Subscriber: takes a daily slot when countTowardLimit (homepage Ask), or
 *   just passes (re-reading a dream already saved in the diary).
 * - Non-subscriber: takes one free analysis (5 in total, max 1 a day).
 * Returns how to refund it if the AI call fails.
 */
export async function consumeAnalysisAccess(
  uid: string,
  countTowardLimit: boolean
): Promise<{ uid: string; charge: "slot" | "free" | null } | { error: NextResponse }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const dayKey = utcDayKey();
  let paid = false;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      paid = hasPaidAccess(data);
      if (!paid) takeFreeUnit(tx, userRef, data, "analysis", dayKey);
    });
  } catch (e: unknown) {
    return quotaError(e);
  }
  if (!paid) return { uid, charge: "free" };
  if (!countTowardLimit) return { uid, charge: null };
  const slot = await consumeDreamSlot(uid);
  if ("error" in slot) return slot;
  return { uid, charge: "slot" };
}

/** Give back a free analysis whose AI call failed. */
export async function refundFreeAnalysis(uid: string) {
  if (!uid) return;
  try {
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const dayKey = utcDayKey();
    const f = FREE_QUOTA_FIELDS.analysis;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      const used = toCount(data[f.total]);
      if (used <= 0) return;
      const patch: Record<string, unknown> = { [f.total]: used - 1 };
      if (String(data[f.dayKey] ?? "") === dayKey) patch[f.today] = Math.max(0, toCount(data[f.today]) - 1);
      tx.set(userRef, patch, { merge: true });
    });
  } catch (e) {
    console.warn("refundFreeAnalysis failed:", e);
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
