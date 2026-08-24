import { NextResponse } from "next/server";
import { readDreamPageImageAssignment } from "@/lib/getDreamPageImage";
import { getDreamEntry } from "@/lib/dream-dictionary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await context.params;
    const slug = decodeURIComponent(symbol || "").trim();
    if (!getDreamEntry(slug)) {
      return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
    }

    return NextResponse.json({ image: await readDreamPageImageAssignment(slug) });
  } catch (error) {
    console.error("[dreams/page-image]", error);
    return NextResponse.json({ error: "Unable to load page image" }, { status: 500 });
  }
}
