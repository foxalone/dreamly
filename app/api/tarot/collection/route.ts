import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import { canReadTarotAccess, isTarotCardId, TAROT_ACCESS_COOKIE } from "@/lib/tarot/access";
import { claimTarotDiscovery, parseTarotCollectionEntry } from "@/lib/tarot/discoveries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(authorization.slice(7))).uid;
  } catch {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
  }
  try {
    const db = adminDb();
    // Preserve today's card even when it was revealed as a guest before sign-in.
    const token = cookieFromRequest(request, TAROT_ACCESS_COOKIE);
    const guestId = readGuestId(request);
    const parts = token?.split(".");
    const day = parts?.[1] ?? "", rawCardId = parts?.[2] ?? "";
    const secret = process.env.CRON_SECRET?.trim();
    if (guestId && secret && isTarotCardId(rawCardId) && canReadTarotAccess(token, guestId, day, rawCardId, secret)) {
      await claimTarotDiscovery(db, uid, day, rawCardId);
    }
    const snapshot = await db.collection("users").doc(uid).collection("tarotCardCounts").limit(22).get();
    const cards = snapshot.docs.map(doc => parseTarotCollectionEntry(doc.data()))
      .filter((card): card is NonNullable<typeof card> => !!card)
      .sort((a, b) => b.lastDay.localeCompare(a.lastDay) || b.count - a.count);
    return NextResponse.json({ cards }, { headers });
  } catch (error) {
    console.error("[tarot/collection]", error);
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
