import { createHash, randomUUID } from "node:crypto";
import type { UserRecord } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { purgeDreamlyAccount } from "@/lib/accountDeletion";

export const runtime = "nodejs";
export const maxDuration = 120;

const appleProvider = "apple.com";
const recentAuthenticationSeconds = 5 * 60;

function failure(code: string, status: number) {
  return NextResponse.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

function result(body: { requiresApple: boolean; deleted?: true } | { deleted: true }) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

function bearer(request: Request) {
  return /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
}

function isSafeDocumentID(uid: string) {
  return uid.length > 0 && uid.length <= 128 && !uid.includes("/") && uid !== "." && uid !== "..";
}

function hasApple(user: UserRecord) {
  return user.providerData.some(provider => provider.providerId === appleProvider);
}

function missingUser(error: unknown) {
  return (error as { code?: unknown } | null)?.code === "auth/user-not-found";
}

function recordFor(uid: string) {
  const hash = createHash("sha256").update(uid).digest("hex");
  return adminDb().collection("accountDeletions").doc(hash);
}

async function revokeAppleToken(token: string, code: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return false;
  const url = new URL("https://identitytoolkit.googleapis.com/v2/accounts:revokeToken");
  url.searchParams.set("key", apiKey);
  // Matches the native Firebase iOS SDK request for an Apple authorization code.
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId: appleProvider, tokenType: "3", token: code, idToken: token }),
    signal: AbortSignal.timeout(15_000),
  });
  return response.ok;
}

async function hasDeletionReceipt(uid: string) {
  const phase = (await recordFor(uid).get()).data()?.phase;
  return phase === "finalizing" || phase === "done";
}

export async function GET(request: Request) {
  const token = bearer(request);
  if (!token) return failure("AUTH_REQUIRED", 401);
  const auth = adminAuth();
  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
    if (!isSafeDocumentID(uid)) return failure("AUTH_REQUIRED", 401);
  } catch {
    return failure("AUTH_REQUIRED", 401);
  }

  let user: UserRecord;
  try {
    await auth.verifyIdToken(token, true);
    user = await auth.getUser(uid);
  } catch (error) {
    if (missingUser(error) && await hasDeletionReceipt(uid)) {
      return result({ requiresApple: false, deleted: true });
    }
    return failure("AUTH_REQUIRED", 401);
  }

  const record = (await recordFor(uid).get()).data();
  return result({ requiresApple: hasApple(user) && record?.appleRevoked !== true });
}

export async function POST(request: Request) {
  const token = bearer(request);
  if (!token) return failure("AUTH_REQUIRED", 401);
  if (new URL(request.url).searchParams.size !== 0) return failure("INVALID_REQUEST", 400);
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body) ||
    Object.keys(body).some(key => key !== "appleAuthorizationCode")) {
    return failure("INVALID_REQUEST", 400);
  }
  const { appleAuthorizationCode } = body as { appleAuthorizationCode?: unknown };
  if (appleAuthorizationCode !== undefined &&
    (typeof appleAuthorizationCode !== "string" || !/^[\x21-\x7E]{1,4096}$/.test(appleAuthorizationCode))) {
    return failure("INVALID_REQUEST", 400);
  }

  const auth = adminAuth();
  let caller;
  try {
    // A signature-verified token can retrieve a completed receipt, but every
    // operation that changes data requires an active, non-revoked session.
    caller = await auth.verifyIdToken(token);
  } catch {
    return failure("AUTH_REQUIRED", 401);
  }
  const uid = caller.uid;
  if (!isSafeDocumentID(uid)) return failure("AUTH_REQUIRED", 401);
  let user: UserRecord;
  try {
    await auth.verifyIdToken(token, true);
    user = await auth.getUser(uid);
  } catch (error) {
    if (missingUser(error) && await hasDeletionReceipt(uid)) return result({ deleted: true });
    return failure("AUTH_REQUIRED", 401);
  }

  const db = adminDb();
  const record = recordFor(uid);
  const lease = randomUUID();
  try {
    const started = Date.now();
    const state = await db.runTransaction(async tx => {
      const prior = (await tx.get(record)).data();
      if (prior?.leaseUntil > started) return null;
      tx.set(record, { lease, leaseUntil: started + 130_000 }, { merge: true });
      return {
        appleRevoked: prior?.appleRevoked === true,
        nextPost: typeof prior?.nextPost === "string" ? prior.nextPost : undefined,
      };
    });
    if (!state) return failure("ACCOUNT_DELETION_BUSY", 409);
    try {
      if (hasApple(user) && !state.appleRevoked) {
        if (typeof appleAuthorizationCode !== "string" ||
          caller.firebase.sign_in_provider !== appleProvider ||
          Date.now() / 1000 - caller.auth_time > recentAuthenticationSeconds) {
          return failure("APPLE_REAUTH_REQUIRED", 403);
        }
        if (!await revokeAppleToken(token, appleAuthorizationCode)) {
          return failure("APPLE_REVOCATION_FAILED", 503);
        }
        await record.set({ appleRevoked: true }, { merge: true });
      }

      const purged = await purgeDreamlyAccount(db, uid, state.nextPost, started + 85_000, async nextPost => {
        await record.set({ nextPost }, { merge: true });
      });
      if (!purged) return failure("ACCOUNT_DELETION_BUSY", 409);
      await record.set({ phase: "finalizing" }, { merge: true });
      try {
        await auth.deleteUser(uid);
      } catch (error) {
        if (!missingUser(error)) throw error;
      }
      // If the final write fails the receipt remains in "finalizing" and a
      // retry can still return success once Firebase confirms the user is gone.
      await record.set({ phase: "done", nextPost: null, appleRevoked: null }, { merge: true }).catch(() => {});
      return result({ deleted: true });
    } finally {
      await db.runTransaction(async tx => {
        if ((await tx.get(record)).data()?.lease === lease) {
          tx.set(record, { lease: null, leaseUntil: 0 }, { merge: true });
        }
      }).catch(() => {});
    }
  } catch {
    return failure("ACCOUNT_DELETION_FAILED", 503);
  }
}
