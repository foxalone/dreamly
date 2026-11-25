import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { readingUnlockPath } from "@/lib/analysisTranslationAccess";
import { readFullSharedDreamAnalysis } from "@/lib/ensureSharedDreamAnalysis";
import { readingDreamId } from "@/lib/readingAdGrant";
import { validRewardId } from "@/lib/rewardedReceipt";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { newGuestId, readGuestId, setGuestCookie } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

// Keep this synchronized with the bundled 13-second YourFit clip.
const PROMO_DURATION_MS = 13_000;
const PROMO_SESSION_MS = 15 * 60_000;
const PROMO_STATE = "yourfitReading";

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** The Android house ad only unlocks the public reading it was started for. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return response({ code: "INVALID_REQUEST" }, 400);
    const id = readingDreamId(body.sharedDreamId);
    const sessionId = body.sessionId;
    const starting = sessionId === undefined;
    if (!id || (!starting && !validRewardId(sessionId))) return response({ code: "INVALID_REQUEST" }, 400);

    const auth = body.idToken == null ? null : await requireSignedInUid(body.idToken);
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid ?? null;
    const existingGuestId = uid ? null : readGuestId(req);
    const guestId = uid ? null : existingGuestId ?? (starting ? newGuestId() : null);
    const viewer = uid ? { uid } : guestId ? { guestId } : null;
    if (!viewer) return response({ code: "AD_REQUIRED" }, 402);
    const db = adminDb();
    // This collection already expires reward sessions. House sessions cannot
    // be redeemed by the Google or Petal reward handlers.
    const sessions = db.collection("androidAnalysisRewards");
    if (!starting) {
      const session = (await sessions.doc(sessionId).get()).data();
      const now = Date.now();
      if (session?.state !== PROMO_STATE || session.uid !== uid || session.guestId !== guestId ||
          session.sharedDreamId !== id || typeof session.readyAtMs !== "number" ||
          typeof session.redeemUntilMs !== "number" || now >= session.redeemUntilMs) {
        return response({ code: "AD_REQUIRED" }, 402);
      }
      if (now < session.readyAtMs) return response({ code: "AD_CONFIRMATION_PENDING" }, 409);
    }

    const dreamRef = db.collection("shared_dreams").doc(id);
    const dream = (await dreamRef.get()).data();
    if (!dream || dream.deleted === true) return response({ code: "NOT_PUBLIC" }, 404);
    const analysis = await readFullSharedDreamAnalysis(db, id, dream);
    if (!analysis) return response({ code: "NO_ANALYSIS" }, 404);

    if (starting) {
      const idForPromo = randomUUID();
      const now = Date.now();
      const redeemUntilMs = now + PROMO_SESSION_MS;
      await sessions.doc(idForPromo).create({
        uid, guestId, sharedDreamId: id, state: PROMO_STATE,
        readyAtMs: now + PROMO_DURATION_MS, redeemUntilMs, expiresAt: Timestamp.fromMillis(redeemUntilMs),
      });
      const started = response({ sessionId: idForPromo });
      return guestId && !existingGuestId ? setGuestCookie(started, guestId) : started;
    }

    const unlock = db.doc(readingUnlockPath(id, viewer));
    const opened = await db.runTransaction(async (tx) => {
      const [publicDream, existing] = await tx.getAll(dreamRef, unlock);
      if (!publicDream.exists || publicDream.data()?.deleted === true) return false;
      if (!existing.exists) tx.create(unlock, { sharedDreamId: id, atMs: Date.now(), source: "yourfit" });
      return true;
    });
    return opened ? response({ analysis }) : response({ code: "NOT_PUBLIC" }, 404);
  } catch {
    return response({ code: "AD_REWARD_FAILED" }, 503);
  }
}
