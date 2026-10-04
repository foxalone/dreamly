import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import {
  DREAMS_PER_DAY,
  FREE_ANALYSES_PER_DAY,
  FREE_ANALYSES_TOTAL,
  SAVES_PER_DAY_ABUSE_CAP,
} from "@/lib/subscriptions/plans";
import { hasPaidAccess, utcDayKey } from "@/lib/subscriptions/status";

export { DREAM_MAX_CHARS, DREAMS_PER_DAY } from "@/lib/subscriptions/plans";

type AccessOk = {
  uid: string;
  remaining: number;
  used: number;
  dayKey: string;
};

function jsonError(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function toCount(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function quotaError(e: unknown): { error: NextResponse } {
  const message = e instanceof Error ? e.message : "";
  if (message === "SUBSCRIPTION_REQUIRED") {
    return { error: jsonError("A Dreamly subscription is required.", "SUBSCRIPTION_REQUIRED", 402) };
  }
  if (message === "FREE_DAILY_LIMIT") {
    return {
      error: jsonError("Free plan: one interpretation a day. Subscribe or try again tomorrow.", "FREE_DAILY_LIMIT", 402),
    };
  }
  if (message === "DAILY_LIMIT") {
    return {
      error: jsonError(`Daily limit reached (${DREAMS_PER_DAY} interpretations). Try again tomorrow.`, "DAILY_LIMIT", 429),
    };
  }
  if (message === "SAVE_ABUSE_CAP") {
    return { error: jsonError("Too many dreams saved today. Try again tomorrow.", "SAVE_ABUSE_CAP", 429) };
  }
  throw e;
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

/**
 * Diary save: free and unlimited for every signed-in user (subscription or
 * not). Only a quiet anti-bot cap of SAVES_PER_DAY_ABUSE_CAP per UTC day.
 */
export async function consumeSaveAccess(uid: string): Promise<AccessOk | { error: NextResponse }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const dayKey = utcDayKey();
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      const current = String(data.savesDayKey ?? "") === dayKey ? toCount(data.savesTodayCount) : 0;
      if (current >= SAVES_PER_DAY_ABUSE_CAP) throw new Error("SAVE_ABUSE_CAP");
      tx.set(
        userRef,
        { savesDayKey: dayKey, savesTodayCount: current + 1, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
      return { uid, used: current + 1, remaining: Math.max(0, SAVES_PER_DAY_ABUSE_CAP - current - 1), dayKey };
    });
  } catch (e: unknown) {
    return quotaError(e);
  }
}

/**
 * AI analysis by a signed-in user, all in one transaction:
 * - subscriber: one of DREAMS_PER_DAY daily slots;
 * - no subscription: one free analysis — FREE_ANALYSES_TOTAL in total, at
 *   most FREE_ANALYSES_PER_DAY per UTC day.
 * Returns which counter to give back if the AI call fails.
 */
export async function consumeAnalysisAccess(
  uid: string
): Promise<{ uid: string; charge: "slot" | "free" } | { error: NextResponse }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const dayKey = utcDayKey();
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      if (hasPaidAccess(data)) {
        const current = String(data.dreamsDayKey ?? "") === dayKey ? toCount(data.dreamsTodayCount) : 0;
        if (current >= DREAMS_PER_DAY) throw new Error("DAILY_LIMIT");
        tx.set(
          userRef,
          {
            dreamsDayKey: dayKey,
            dreamsTodayCount: current + 1,
            dreamsSlotUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return { uid, charge: "slot" as const };
      }
      const used = toCount(data.freeAnalysesUsed);
      if (used >= FREE_ANALYSES_TOTAL) throw new Error("SUBSCRIPTION_REQUIRED");
      const today = String(data.freeAnalysisDayKey ?? "") === dayKey ? toCount(data.freeAnalysesTodayCount) : 0;
      if (today >= FREE_ANALYSES_PER_DAY) throw new Error("FREE_DAILY_LIMIT");
      tx.set(
        userRef,
        {
          freeAnalysesUsed: used + 1,
          freeAnalysisDayKey: dayKey,
          freeAnalysesTodayCount: today + 1,
          freeAnalysisAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { uid, charge: "free" as const };
    });
  } catch (e: unknown) {
    return quotaError(e);
  }
}

/** Give back a free analysis whose AI call failed. */
export async function refundFreeAnalysis(uid: string) {
  if (!uid) return;
  try {
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);
    const dayKey = utcDayKey();
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      const used = toCount(data.freeAnalysesUsed);
      if (used <= 0) return;
      const patch: Record<string, unknown> = { freeAnalysesUsed: used - 1 };
      if (String(data.freeAnalysisDayKey ?? "") === dayKey) {
        patch.freeAnalysesTodayCount = Math.max(0, toCount(data.freeAnalysesTodayCount) - 1);
      }
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
