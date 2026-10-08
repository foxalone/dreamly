import { NextResponse } from "next/server";

import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

type Body = { idToken?: string };

/**
 * POST { idToken } — after sign-in, move the feed translations this browser
 * unlocked as a guest (paid with rewarded ads) into the account:
 *
 *   guestQuickSymbol/{guestId}/translationUnlocks/{sharedDreamId}
 *     → users/{uid}/translationUnlocks/{sharedDreamId}   (langs merged)
 *
 * Ownership is proven by the dreamly_guest cookie — the same browser that
 * watched the ads. Idempotent: nothing left under the guest → { moved: 0 }.
 * Unspent guest ad credits are not moved (a signed-in user has the daily free
 * translation instead).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const uid = auth.uid;

    const guestId = readGuestId(req);
    if (!guestId) return NextResponse.json({ ok: true, moved: 0, code: "NO_GUEST" });

    const db = adminDb();
    const guestUnlocks = db.collection("guestQuickSymbol").doc(guestId).collection("translationUnlocks");
    const snap = await guestUnlocks.get();
    if (snap.empty) return NextResponse.json({ ok: true, moved: 0 });

    const now = Date.now();
    const batch = db.batch();
    let moved = 0;
    for (const d of snap.docs) {
      const data = (d.data() as Record<string, unknown>) ?? {};
      const langs = data.langs && typeof data.langs === "object" ? (data.langs as Record<string, unknown>) : {};
      // merge: true keeps langs the account already has; a lang the guest paid
      // for is added with its own atMs/source so the ledger stays honest.
      batch.set(
        db.doc(`users/${uid}/translationUnlocks/${d.id}`),
        { sharedDreamId: d.id, updatedAtMs: now, claimedFromGuestId: guestId, langs },
        { merge: true }
      );
      batch.delete(d.ref);
      moved++;
    }
    await batch.commit();

    return NextResponse.json({ ok: true, moved });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
