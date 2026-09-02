import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import {
  markLibraryVideoPublishedManually,
  type LibraryPublishPlatform,
} from "@/app/api/admin/_lib/libraryVideo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORMS = new Set<LibraryPublishPlatform>(["tiktok", "instagram", "facebook", "threads", "bluesky", "youtube", "pinterest"]);

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { libraryId?: string; platform?: string };
    const libraryId = String(body.libraryId || "").trim();
    const platform = String(body.platform || "").trim() as LibraryPublishPlatform;

    if (!/^(free|ai):[A-Za-z0-9_-]{6,128}$/.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }
    if (!PLATFORMS.has(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const result = await markLibraryVideoPublishedManually(libraryId, platform, adminUid);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message.includes("Invalid") || message.includes("not found")
            ? 400
            : message.includes("already marked")
              ? 409
              : 500;
    if (status === 500) console.error("[admin/video-library/mark-published]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
