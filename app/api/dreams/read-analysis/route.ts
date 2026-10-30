import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { readFullSharedDreamAnalysis } from "@/lib/ensureSharedDreamAnalysis";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { matchingReadingAdGrant, readingDreamId } from "@/lib/readingAdGrant";
import { hasPaidAccess } from "@/lib/subscriptions/status";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

/**
 * POST { sharedDreamId, idToken? } — the full reading behind a public dream.
 * The author and a subscriber get it directly. Everyone else needs a rewarded
 * ad for this dream (or an unlock that ad already created). The preview on
 * the dream itself stays public.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = readingDreamId((body as { sharedDreamId?: unknown }).sharedDreamId);
    if (!id) return NextResponse.json({ code: "BAD_DREAM" }, { status: 400 });

    const db = adminFirestore();
    const dreamRef = db.collection("shared_dreams").doc(id);
    const dreamSnap = await dreamRef.get();
    const data = (dreamSnap.data() ?? {}) as Record<string, unknown>;
    if (!dreamSnap.exists || data.deleted === true) {
      return NextResponse.json({ code: "NOT_PUBLIC" }, { status: 404 });
    }
    const analysis = await readFullSharedDreamAnalysis(db, id, data);
    if (!analysis) return NextResponse.json({ code: "NO_ANALYSIS" }, { status: 404 });

    const guestId = readGuestId(req);
    const token = (body as { idToken?: unknown }).idToken;
    const auth = token ? await requireSignedInUid(token) : null;
    const uid = auth && !("error" in auth) ? auth.uid : null;
    const owner = (uid && data.ownerUid === uid) || (guestId && data.ownerGuestId === guestId);
    if (owner) return NextResponse.json({ analysis });

    if (uid) {
      const userRef = db.collection("users").doc(uid);
      const unlockRef = userRef.collection("readingUnlocks").doc(id);
      const grantRef = userRef.collection("readingUnlocks").doc("__adGrant");
      const [userSnap, unlockSnap] = await Promise.all([userRef.get(), unlockRef.get()]);
      if (hasPaidAccess(userSnap.data() as Record<string, unknown> | undefined) || unlockSnap.exists) {
        return NextResponse.json({ analysis });
      }
      const opened = await db.runTransaction(async (tx) => {
        const grant = await tx.get(grantRef);
        if (!matchingReadingAdGrant(grant.data(), id)) return false;
        tx.delete(grantRef);
        tx.set(unlockRef, { sharedDreamId: id, atMs: Date.now() });
        return true;
      });
      if (opened) return NextResponse.json({ analysis });
      return NextResponse.json({ code: "AD_REQUIRED" }, { status: 402 });
    }

    if (guestId) {
      const guestRef = db.collection("guestQuickSymbol").doc(guestId);
      const unlockRef = guestRef.collection("readingUnlocks").doc(id);
      if ((await unlockRef.get()).exists) return NextResponse.json({ analysis });
      const opened = await db.runTransaction(async (tx) => {
        const guest = await tx.get(guestRef);
        if (!matchingReadingAdGrant(guest.data()?.readingAdGrant, id)) return false;
        tx.set(guestRef, { readingAdGrant: FieldValue.delete() }, { merge: true });
        tx.set(unlockRef, { sharedDreamId: id, atMs: Date.now() });
        return true;
      });
      if (opened) return NextResponse.json({ analysis });
    }

    return NextResponse.json({ code: "GUEST_AD_REQUIRED" }, { status: 402 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
