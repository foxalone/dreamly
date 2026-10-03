import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { guestSharedDocId, shareBadgeFor } from "@/lib/shareBadges";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

type Body = { idToken?: string; dreamId?: string };

/**
 * POST { idToken, dreamId } — right after sign-in, the homepage-dream import
 * hands the guest's anonymous share over to the new account.
 *
 * shared_dreams/guest_{guestId} (owner = cookie) is copied to
 * shared_dreams/{uid}_{dreamId}, the id every other code path expects (journal
 * delete, admin), and the guest doc is removed. Ownership is proven by the
 * guest cookie — the same browser that shared it.
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

    const db = adminDb();
    const srcRef = db.collection("shared_dreams").doc(guestSharedDocId(guestId));
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

    const result = await db.runTransaction(async (tx) => {
      const src = await tx.get(srcRef);
      const data = src.data();
      if (!src.exists || !data || data.ownerGuestId !== guestId || data.ownerUid) return null;

      const count = before + 1;
      tx.set(destRef, {
        ...data,
        ownerUid: uid,
        ownerDreamId: dreamId,
        claimedFromGuestId: guestId,
        claimedAtMs: Date.now(),
        shareBadge: shareBadgeFor(count).id,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.delete(srcRef);
      return { count, sharedAtMs: Number(data.sharedAtMs) || Date.now() };
    });

    if (!result) return NextResponse.json({ ok: false, code: "NOTHING_TO_CLAIM" });

    return NextResponse.json({ ok: true, sharedId: destId, ...result });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
