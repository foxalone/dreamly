import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { publishLibraryVideoToYouTube } from "@/app/api/admin/youtube/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { libraryId?: string; publishAt?: string };
    const libraryId = String(body.libraryId || "").trim();
    if (!/^(free|ai):[A-Za-z0-9_-]{6,128}$/.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }

    const result = await publishLibraryVideoToYouTube(libraryId, adminUid, String(body.publishAt || ""));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message.includes("Invalid publish date") || message.includes("Scheduled time must")
            ? 400
            : message.includes("already published") ||
              message.includes("already scheduled") ||
              message.includes("already running") ||
              message.includes("not connected") ||
              message.includes("not configured")
            ? 409
            : 500;
    if (status === 500) console.error("[admin/youtube/publish]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
