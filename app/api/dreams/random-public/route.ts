import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { pickRandomDreams, publicDreamCards } from "@/lib/randomDreams";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Match the feed window so each card can deep-link to a visible dream.
    const snapshot = await adminFirestore().collection("shared_dreams").orderBy("sharedAtMs", "desc").limit(50).get();
    const cards = publicDreamCards(snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
    // Cache a small pool; the browser draws a different row for each page visit.
    return NextResponse.json({ dreams: pickRandomDreams(cards, 24) }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json({ dreams: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
