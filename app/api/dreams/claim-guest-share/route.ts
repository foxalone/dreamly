import { NextResponse } from "next/server";
import { dreamPageIndexNowPaths, notifyIndexNow } from "@/lib/indexnow";
import { FieldValue } from "firebase-admin/firestore";

import { publicAnalysisFields } from "@/lib/analysisPreview";
import { cleanAnalysis } from "@/lib/publicDreamAnalysis";
import { guestSharedDocId, shareBadgeFor } from "@/lib/shareBadges";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

type Body = { idToken?: string; dreamId?: string; sharedId?: string };

/**
 * POST { idToken, dreamId, sharedId? } — right after sign-in, the
 * homepage-dream import hands the guest's anonymous share over to the new
 * account, one dream at a time.
 *
 * sharedId is the guest doc from the device cache
 * (shared_dreams/guest_{guestId}_{textHash}, see ../share-guest); old caches
 * without one fall back to the legacy one-per-guest id guest_{guestId}. The
 * doc (owner = cookie) is copied to shared_dreams/{uid}_{dreamId}, the id
 * every other code path expects (journal delete, admin), and the guest doc is
 * removed. Ownership is proven by the guest cookie — the same browser that
 * shared it — so the id must belong to that guest.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const uid = auth.uid;

    const dreamId = String(body?.dreamId ?? "").trim();
    if (!/^[\w-]{1,80}$/.test(dreamId)) {
      return NextResponse.json({ ok: false, error: "Bad dreamId" }, { status: 400 });
    }

    const guestId = readGuestId(req);
    if (!guestId) return NextResponse.json({ ok: false, code: "NO_GUEST" });

    // The guest doc to claim. Only ids of THIS guest's docs are accepted —
    // the transaction re-checks ownerGuestId anyway.
    const requestedId = String(body?.sharedId ?? "").trim();
    const srcId =
      requestedId && /^[\w-]{1,120}$/.test(requestedId) && requestedId.startsWith(`guest_${guestId}`)
        ? requestedId
        : guestSharedDocId(guestId);

    const db = adminDb();
    const srcRef = db.collection("shared_dreams").doc(srcId);
    const destId = `${uid}_${dreamId}`;
    const destRef = db.collection("shared_dreams").doc(destId);

    // Shares the account already has, for the badge stamped on the moved doc.
    const before = await db
      .collection("shared_dreams")
      .where("ownerUid", "==", uid)
      .where("deleted", "==", false)
      .count()
      .get()
      .then((snap) => snap.data().count)
      .catch(() => 0);

    const userDreamRef = db.collection("users").doc(uid).collection("dreams").doc(dreamId);
    const srcPrivateRef = srcRef.collection("private").doc("analysis");
    const result = await db.runTransaction(async (tx) => {
      const [src, userDream, srcPrivate] = await Promise.all([
        tx.get(srcRef),
        tx.get(userDreamRef),
        tx.get(srcPrivateRef),
      ]);
      const data = src.data();
      if (!src.exists || !data || data.ownerGuestId !== guestId || data.ownerUid) return null;

      const count = before + 1;
      const full =
        cleanAnalysis(srcPrivate.data()?.text) ||
        (data.analysisIsPreview === true ? cleanAnalysis(userDream.data()?.analysisText) : cleanAnalysis(data.analysisText)) ||
        cleanAnalysis(userDream.data()?.analysisText);
      tx.set(destRef, {
        ...data,
        ...publicAnalysisFields(full),
        ownerUid: uid,
        ownerDreamId: dreamId,
        claimedFromGuestId: guestId,
        claimedAtMs: Date.now(),
        shareBadge: shareBadgeFor(count).id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (full) {
        tx.set(destRef.collection("private").doc("analysis"), { text: full, updatedAtMs: Date.now() });
      }
      if (srcPrivate.exists) tx.delete(srcPrivateRef);
      tx.delete(srcRef);
      return { count, sharedAtMs: Number(data.sharedAtMs) || Date.now() };
    });

    if (!result) return NextResponse.json({ ok: false, code: "NOTHING_TO_CLAIM" });

    // The public page moved from /dream/guest_<id> to /dream/<uid>_<dreamId>.
    void notifyIndexNow(dreamPageIndexNowPaths(destId), { reason: "claim-guest-share" });

    return NextResponse.json({ ok: true, sharedId: destId, ...result });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
