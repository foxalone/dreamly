import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { NextResponse } from "next/server";

import { adminDb } from "../../admin/_lib/firebaseAdmin";

/** Name of the anonymous-visitor cookie. */
export const GUEST_COOKIE = "dreamly_guest";

/** Free AI lookups an anonymous visitor gets before we ask them to sign in. */
export const GUEST_FREE_ASKS = 1;

/**
 * Backstop so clearing the cookie in a loop cannot burn the OpenAI budget.
 * Counted per hashed IP per UTC day.
 */
const GUEST_IP_DAILY_LIMIT = 5;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type GuestConsumeResult =
  | { ok: true; used: number }
  | { ok: false; reason: "guest_limit" | "ip_limit" };

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function hashIp(ip: string) {
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

      if (Number.isFinite(used) && used >= GUEST_FREE_ASKS) {
        throw new Error("GUEST_LIMIT");
      }
      if (Number.isFinite(ipUsed) && ipUsed >= GUEST_IP_DAILY_LIMIT) {
        throw new Error("IP_LIMIT");
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

      return { ok: true as const, used: used + 1 };
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message === "GUEST_LIMIT") return { ok: false, reason: "guest_limit" };
    if (message === "IP_LIMIT") return { ok: false, reason: "ip_limit" };
    throw e;
  }
}

/** Give the free lookup back when the model call failed. */
export async function refundGuestAsk(guestId: string, ip: string) {
  try {
    const db = adminDb();
    const dayKey = utcDayKey();
    await db
      .collection("guestQuickSymbol")
      .doc(guestId)
      .set({ used: FieldValue.increment(-1) }, { merge: true });
    await db
      .collection("guestQuickSymbolIp")
      .doc(`${hashIp(ip)}_${dayKey}`)
      .set({ used: FieldValue.increment(-1) }, { merge: true });
  } catch (e) {
    console.warn("refundGuestAsk failed:", e);
  }
}
