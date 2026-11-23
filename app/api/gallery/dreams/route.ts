import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { readGuestId } from "../../dreams/_lib/guestQuota";
import { listDreamGallery } from "@/lib/dreamImageGallery";
import { optionalGalleryUid } from "../viewer";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get("cursor");
  try {
    const uid = await optionalGalleryUid(request);
    const page = await listDreamGallery(adminDb(), cursor, uid, uid ? null : readGuestId(request));
    return page ? NextResponse.json(page, { headers }) : NextResponse.json({ code: "INVALID_CURSOR" }, { status: 400, headers });
  } catch (error) {
    console.error("[dreamImageGallery:list]", error);
    return NextResponse.json({ code: "GALLERY_UNAVAILABLE" }, { status: 503, headers });
  }
}
