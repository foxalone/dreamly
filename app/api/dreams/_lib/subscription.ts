import { type Firestore, FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import {
  DREAMS_PER_DAY,
  FREE_ANALYSES_PER_DAY,
  FREE_ANALYSES_TOTAL,
  AD_REWARDS_PER_DAY,
  AD_SAVE_REWARDS_PER_DAY,
  AD_TRANSLATE_REWARDS_PER_DAY,
  FREE_SAVES_PER_IP_PER_DAY,
  SAVES_PER_DAY_ABUSE_CAP,
} from "@/lib/subscriptions/plans";
import { hasPaidAccess, utcDayKey } from "@/lib/subscriptions/status";
import { hashIp } from "./guestQuota";

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
  if (message === "AD_DAILY_LIMIT") {
    return { error: jsonError("No more ad rewards today. Try again tomorrow.", "AD_DAILY_LIMIT", 429) };
  }
  if (message === "AD_NOT_NEEDED") {
    return { error: jsonError("Subscribers do not need ad rewards.", "AD_NOT_NEEDED", 400) };
  }
  if (message === "SAVE_IP_LIMIT") {
    return {
      error: jsonError("Free saves for today are used up. Watch an ad or subscribe.", "SAVE_IP_LIMIT", 402),
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
 * Diary save for a signed-in user.
 * - Subscriber: unlimited (only the SAVES_PER_DAY_ABUSE_CAP anti-bot cap).
 * - No subscription: FREE_SAVES_PER_IP_PER_DAY saves per network (hashed
 *   IP) per UTC day; after that one adSaveCredits credit (earned by watching
 *   a rewarded ad) per save, else SAVE_IP_LIMIT.
 */
export async function consumeSaveAccess(
  uid: string,
  ip: string
): Promise<(AccessOk & { charge: "free" | "ad" | "paid" }) | { error: NextResponse }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const dayKey = utcDayKey();
  const ipRef = db.collection("saveIpDaily").doc(`${hashIp(ip || "unknown")}_${dayKey}`);
  try {
    return await db.runTransaction(async (tx) => {
      const [snap, ipSnap] = await Promise.all([tx.get(userRef), tx.get(ipRef)]);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      const current = String(data.savesDayKey ?? "") === dayKey ? toCount(data.savesTodayCount) : 0;
      if (current >= SAVES_PER_DAY_ABUSE_CAP) throw new Error("SAVE_ABUSE_CAP");
      const userPatch: Record<string, unknown> = {
        savesDayKey: dayKey,
        savesTodayCount: current + 1,
        updatedAt: FieldValue.serverTimestamp(),
      };
      let charge: "free" | "ad" | "paid" = "paid";
      if (!hasPaidAccess(data)) {
        const ipCount = ipSnap.exists ? toCount(ipSnap.get("count")) : 0;
        if (ipCount < FREE_SAVES_PER_IP_PER_DAY) {
          charge = "free";
          tx.set(
            ipRef,
            { count: ipCount + 1, dayKey, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
        } else {
          const credits = toCount(data.adSaveCredits);
          if (credits < 1) throw new Error("SAVE_IP_LIMIT");
          charge = "ad";
          userPatch.adSaveCredits = credits - 1;
        }
      }
      tx.set(userRef, userPatch, { merge: true });
      return {
        uid,
        used: current + 1,
        remaining: Math.max(0, SAVES_PER_DAY_ABUSE_CAP - current - 1),
        dayKey,
        charge,
      };
    });
  } catch (e: unknown) {
    return quotaError(e);
  }
}

/**
 * AI analysis by a signed-in user, all in one transaction:
 * - subscriber: one of DREAMS_PER_DAY daily slots;
 * - no subscription: one free analysis — FREE_ANALYSES_TOTAL in total, at
 *   most FREE_ANALYSES_PER_DAY per UTC day; when those are gone, one
 *   adAnalysisCredits credit earned by watching a rewarded ad.
 * Returns which counter to give back if the AI call fails.
 */
export async function consumeAnalysisAccess(
  uid: string
): Promise<{ uid: string; charge: "slot" | "free" | "ad" } | { error: NextResponse }> {
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
      const today = String(data.freeAnalysisDayKey ?? "") === dayKey ? toCount(data.freeAnalysesTodayCount) : 0;
      if (used >= FREE_ANALYSES_TOTAL || today >= FREE_ANALYSES_PER_DAY) {
        // Free quota is gone — spend a credit earned by watching an ad, if any.
        const credits = toCount(data.adAnalysisCredits);
        if (credits > 0) {
          tx.set(
            userRef,
            { adAnalysisCredits: credits - 1, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          );
          return { uid, charge: "ad" as const };
        }
        throw new Error(used >= FREE_ANALYSES_TOTAL ? "SUBSCRIPTION_REQUIRED" : "FREE_DAILY_LIMIT");
      }
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

/** Give back an ad credit whose AI call failed. */
export async function refundAdCredit(uid: string) {
  if (!uid) return;
  try {
    await adminDb()
      .collection("users")
      .doc(uid)
      .set({ adAnalysisCredits: FieldValue.increment(1) }, { merge: true });
  } catch (e) {
    console.warn("refundAdCredit failed:", e);
  }
}

/**
 * The user finished a rewarded ad: grant one credit — an AI analysis
 * (adAnalysisCredits, max AD_REWARDS_PER_DAY a day) or a diary save
 * (adSaveCredits, max AD_SAVE_REWARDS_PER_DAY a day). Subscribers never need it.
 */
export async function grantAdReward(
  uid: string,
  kind: "analysis" | "save" | "translate",
  rewardId: string,
  database?: Firestore
): Promise<{ uid: string; credits: number; leftToday: number } | { error: NextResponse }> {
  if (!uid) {
    return { error: jsonError("Sign in required.", "AUTH_REQUIRED", 401) };
  }
  const db = database ?? adminDb();
  const userRef = db.collection("users").doc(uid);
  const receiptRef = userRef.collection("adRewardReceipts").doc(rewardId);
  const dayKey = utcDayKey();
  try {
    return await db.runTransaction(async (tx) => {
      const receipt = await tx.get(receiptRef);
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as Record<string, unknown>) ?? {}) : {};
      if (hasPaidAccess(data)) throw new Error("AD_NOT_NEEDED");
      // Separate counters and caps for analysis ads and save ads.
      const f =
        kind === "save"
          ? { credits: "adSaveCredits", day: "adSaveRewardsDayKey", today: "adSaveRewardsTodayCount", cap: AD_SAVE_REWARDS_PER_DAY }
          : kind === "translate"
          ? { credits: "adTranslateCredits", day: "adTranslateRewardsDayKey", today: "adTranslateRewardsTodayCount", cap: AD_TRANSLATE_REWARDS_PER_DAY }
          : { credits: "adAnalysisCredits", day: "adRewardsDayKey", today: "adRewardsTodayCount", cap: AD_REWARDS_PER_DAY };
      const today = String(data[f.day] ?? "") === dayKey ? toCount(data[f.today]) : 0;
      if (receipt.exists) {
        if (receipt.data()?.kind !== kind) return { error: NextResponse.json({ code: "REWARD_KIND_MISMATCH" }, { status: 409 }) };
        return { uid, credits: toCount(data[f.credits]), leftToday: Math.max(0, f.cap - today) };
      }
      if (today >= f.cap) throw new Error("AD_DAILY_LIMIT");
      const credits = toCount(data[f.credits]) + 1;
      tx.create(receiptRef, { kind, createdAt: FieldValue.serverTimestamp() });
      tx.set(
        userRef,
        {
          [f.credits]: credits,
          [f.day]: dayKey,
          [f.today]: today + 1,
          adRewardAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { uid, credits, leftToday: f.cap - today - 1 };
    });
  } catch (e: unknown) {
    return quotaError(e);
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
