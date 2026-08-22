import { NextResponse } from "next/server";
import { DREAM_PAGE_IMAGE_COLLECTION } from "@/lib/dreamPageImage";
import { getDreamEntry } from "@/lib/dream-dictionary";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await context.params;
    const slug = decodeURIComponent(symbol || "").trim();
    if (!getDreamEntry(slug)) {
      return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
    }

    const snapshot = await adminDb().collection(DREAM_PAGE_IMAGE_COLLECTION).doc(slug).get();
    const data = snapshot.data() as { imageUrl?: string; subject?: string; imageJobId?: string } | undefined;
    const imageUrl = String(data?.imageUrl || "");
    if (!snapshot.exists || !imageUrl) {
      return NextResponse.json({ image: null });
    }

    return NextResponse.json({
      image: {
        slug,
        imageJobId: String(data?.imageJobId || ""),
        imageUrl,
        subject: String(data?.subject || ""),
      },
    });
  } catch (error) {
    console.error("[dreams/page-image]", error);
    return NextResponse.json({ error: "Unable to load page image" }, { status: 500 });
  }
}
