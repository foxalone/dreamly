import { NextResponse } from "next/server";

import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { requireSignedInUid } from "@/app/api/dreams/_lib/requireUser";
import { claimGuestReactions } from "@/lib/guestReactions";
import { claimGuestGalleryHearts } from "@/lib/guestGalleryHearts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const auth = await requireSignedInUid(body?.idToken);
  if ("error" in auth) return auth.error;
  const guestId = readGuestId(req);
  if (!guestId) return NextResponse.json({ ok: true, moved: 0 });
  try {
    const db = adminDb();
    const [dreams, gallery] = await Promise.all([
      claimGuestReactions(db, guestId, auth.uid),
      claimGuestGalleryHearts(db, guestId, auth.uid),
    ]);
    return NextResponse.json({ ok: true, moved: dreams + gallery });
  } catch (error) {
    console.error("Guest reaction claim failed", error);
    return NextResponse.json({ ok: false, error: "Could not claim reactions." }, { status: 500 });
  }
}
