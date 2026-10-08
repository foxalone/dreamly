import { createHash, randomUUID } from "node:crypto";
import { type Firestore, FieldValue } from "firebase-admin/firestore";
import type { NextResponse } from "next/server";

import { AD_REWARDS_PER_DAY, AD_TRANSLATE_REWARDS_PER_DAY } from "@/lib/subscriptions/plans";
import { guestAnalysisAccess } from "@/lib/guestAnalysisAccess";
export { GUEST_FREE_ASKS } from "@/lib/guestAnalysisAccess";

import { adminDb } from "../../admin/_lib/firebaseAdmin";

/** Name of the anonymous-visitor cookie. */
export const GUEST_COOKIE = "dreamly_guest";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type GuestConsumeResult =
  | { ok: true; used: number; charge: "free" | "ad"; dayKey: string }
  | { ok: false; reason: "guest_limit" | "ip_limit" };

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function hashIp(ip: string) {
  const salt = process.env.GUEST_IP_SALT?.trim() || "dreamly-guest";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Best-effort client IP behind Vercel's proxy. */
export function readClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function readGuestId(req: Request): string | null {
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return null;

  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== GUEST_COOKIE) continue;
    const value = decodeURIComponent(rest.join("=")).trim();
    // Only ever accept ids we could have issued ourselves.
    if (/^[0-9a-f-]{8,64}$/i.test(value)) return value;
    return null;
  }
  return null;
}

export function newGuestId() {
  return randomUUID();
}

export function setGuestCookie<T extends NextResponse>(res: T, guestId: string): T {
  res.cookies.set(GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}

/**
 * Books one free anonymous lookup. Reads both counters before writing so the
 * whole thing stays inside a single Firestore transaction.
 */
export async function consumeGuestAsk(
  guestId: string,
  ip: string
): Promise<GuestConsumeResult> {
  const db = adminDb();
  const dayKey = utcDayKey();
  const guestRef = db.collection("guestQuickSymbol").doc(guestId);
  const ipRef = db.collection("guestQuickSymbolIp").doc(`${hashIp(ip)}_${dayKey}`);

  try {
    return await db.runTransaction(async (tx) => {
      const guestSnap = await tx.get(guestRef);
      const ipSnap = await tx.get(ipRef);

      const used = Number(guestSnap.data()?.used ?? 0);
      const ipUsed = Number(ipSnap.data()?.used ?? 0);

      const access = guestAnalysisAccess(used, ipUsed, Number(guestSnap.data()?.adAnalysisCredits ?? 0));
      if (access === "guest_limit") throw new Error("GUEST_LIMIT");
      if (access === "ip_limit") throw new Error("IP_LIMIT");
      if (access === "ad") {
        tx.set(guestRef, { adAnalysisCredits: FieldValue.increment(-1) }, { merge: true });
        return { ok: true as const, used, charge: "ad" as const, dayKey };
      }

      tx.set(
        guestRef,
        {
          used: FieldValue.increment(1),
          lastAt: FieldValue.serverTimestamp(),
          ...(guestSnap.exists ? {} : { firstAt: FieldValue.serverTimestamp() }),
        },
        { merge: true }
      );

      tx.set(
        ipRef,
        {
          used: FieldValue.increment(1),
          dayKey,
          lastAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { ok: true as const, used: used + 1, charge: "free" as const, dayKey };
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message === "GUEST_LIMIT") return { ok: false, reason: "guest_limit" };
    if (message === "IP_LIMIT") return { ok: false, reason: "ip_limit" };
    throw e;
  }
}

/** Refund exactly the balance and UTC day charged by this request. */
export async function refundGuestAsk(
  guestId: string,
  ip: string,
  booking: Extract<GuestConsumeResult, { ok: true }>
) {
  try {
    const db = adminDb();
    const batch = db.batch();
    const guestRef = db.collection("guestQuickSymbol").doc(guestId);
    if (booking.charge === "ad") {
      batch.set(guestRef, { adAnalysisCredits: FieldValue.increment(1) }, { merge: true });
    } else {
      batch.set(guestRef, { used: FieldValue.increment(-1) }, { merge: true });
      batch.set(
        db.collection("guestQuickSymbolIp").doc(`${hashIp(ip)}_${booking.dayKey}`),
        { used: FieldValue.increment(-1) },
        { merge: true }
      );
    }
    await batch.commit();
  } catch (e) {
    console.warn("refundGuestAsk failed:", e);
  }
}

/**
 * What a guest can earn by watching a rewarded ad. "analysis" is the original
 * flow (one more AI interpretation); "translate" is a feed translation —
 * guests have no free daily translation, so an ad credit is their only way in
 * besides signing in. Each kind has its own credit and its own daily caps
 * (guest + network), mirroring users/{uid}.ad*Credits for signed-in users.
 */
export type GuestAdKind = "analysis" | "translate";

const GUEST_AD_FIELDS = {
  analysis: {
    credits: "adAnalysisCredits",
    dayKey: "adRewardsDayKey",
    today: "adRewardsTodayCount",
    perDay: AD_REWARDS_PER_DAY,
  },
  translate: {
    credits: "adTranslateCredits",
    dayKey: "adTranslateRewardsDayKey",
    today: "adTranslateRewardsTodayCount",
    perDay: AD_TRANSLATE_REWARDS_PER_DAY,
  },
} as const;

export function normalizeGuestAdKind(value: unknown): GuestAdKind {
  return value === "translate" ? "translate" : "analysis";
}

/** Same browser-reported reward model as signed-in ads; cap both guest and IP. */
export async function guestAdReward(
  guestId: string,
  ip: string,
  grant = false,
  rewardId?: string,
  database?: Firestore,
  kind: GuestAdKind = "analysis"
) {
  const db = database ?? adminDb();
  const dayKey = utcDayKey();
  const f = GUEST_AD_FIELDS[kind];
  const guestRef = db.collection("guestQuickSymbol").doc(guestId);
  const ipRef = db.collection("guestQuickSymbolIp").doc(`${hashIp(ip)}_${dayKey}`);
  return db.runTransaction(async (tx) => {
    const receiptRef = grant && rewardId ? guestRef.collection("adRewardReceipts").doc(rewardId) : null;
    const receipt = receiptRef ? await tx.get(receiptRef) : null;
    const guest = (await tx.get(guestRef)).data() ?? {};
    const network = (await tx.get(ipRef)).data() ?? {};
    const today = guest[f.dayKey] === dayKey ? Number(guest[f.today] ?? 0) : 0;
    const ipToday = Number(network[f.today] ?? 0);
    const leftToday = Math.max(0, f.perDay - Math.max(today, ipToday));
    const credits = Math.max(0, Number(guest[f.credits] ?? 0));
    if (receipt?.exists) return { credits, leftToday, replayed: true };
    if (grant && !receiptRef) throw new Error("INVALID_REWARD_ID");
    // Reuse an unspent credit, including after a failed analysis or grant retry.
    if (!grant || (leftToday === 0 && credits === 0)) return { credits, leftToday };
    // Consume the replay key even when reusing an existing unspent credit.
    tx.create(receiptRef!, { createdAt: FieldValue.serverTimestamp() });
    if (credits > 0) return { credits, leftToday };
    tx.set(guestRef, {
      [f.credits]: credits + 1,
      [f.dayKey]: dayKey,
      [f.today]: today + 1,
    }, { merge: true });
    tx.set(ipRef, { [f.today]: ipToday + 1 }, { merge: true });
    return { credits: credits + 1, leftToday: leftToday - 1 };
  });
}

/**
 * Feed translation for a guest: spends one ad-earned translate credit. There
 * is no free slot for guests (sign in for the daily free one), and a dream+lang
 * the guest already unlocked is served free by the translate route before this
 * is called (see translationLedger.ts, guest owner).
 */
export async function consumeGuestTranslation(guestId: string, database?: Firestore): Promise<boolean> {
  const db = database ?? adminDb();
  const guestRef = db.collection("guestQuickSymbol").doc(guestId);
  return db.runTransaction(async (tx) => {
    const guest = (await tx.get(guestRef)).data() ?? {};
    const credits = Math.max(0, Math.floor(Number(guest.adTranslateCredits ?? 0)));
    if (credits <= 0) return false;
    tx.set(guestRef, { adTranslateCredits: credits - 1 }, { merge: true });
    return true;
  });
}

/** Give the translate credit back when the translation itself failed. */
export async function refundGuestTranslation(guestId: string, database?: Firestore) {
  try {
    const db = database ?? adminDb();
    await db.collection("guestQuickSymbol").doc(guestId).set({ adTranslateCredits: FieldValue.increment(1) }, { merge: true });
  } catch (e) {
    console.warn("refundGuestTranslation failed:", e);
  }
}
