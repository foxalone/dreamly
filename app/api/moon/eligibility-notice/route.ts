import { NextResponse } from "next/server";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { MOON_THRESHOLD, publishedDreamCount } from "@/lib/moon/model";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const user = await requireSignedInUid(body?.idToken);
  if ("error" in user) return user.error;

  try {
    const db = adminFirestore();
    const receiptRef = db.doc(`users/${user.uid}/notifications/moonEligibility`);
    const shares = db.collection("shared_dreams")
      .where("ownerUid", "==", user.uid)
      .select("ownerDreamId", "ownerStoryId", "text", "deleted", "sourceType");

    const status = await db.runTransaction(async (transaction) => {
      if ((await transaction.get(receiptRef)).exists) return "already_shown";

      const snapshot = await transaction.get(shares);
      const count = publishedDreamCount(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
      if (count < MOON_THRESHOLD) return "ineligible";

      // Give only one tab or device permission to open the notice.
      transaction.create(receiptRef, { claimedAtMs: Date.now() });
      return "show";
    });

    return NextResponse.json({ status }, { headers });
  } catch (error) {
    console.error("Moon eligibility notice failed", error);
    return NextResponse.json({ error: "MOON_UNAVAILABLE" }, { status: 503, headers });
  }
}
