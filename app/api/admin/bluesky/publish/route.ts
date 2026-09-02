import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { publishLibraryVideoToBluesky } from "@/app/api/admin/bluesky/_lib";
import { BlueskyPublishError, sanitizeBlueskyError } from "@/lib/adminBluesky";
import { isSocialPublishPendingError } from "@/lib/socialPublishPending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { libraryId?: string };
    const libraryId = String(body.libraryId || "").trim();
    if (!/^(free|ai):[A-Za-z0-9_-]{6,128}$/.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await publishLibraryVideoToBluesky(libraryId, adminUid)) });
  } catch (error) {
    const message = sanitizeBlueskyError(error, [String(process.env.BLUESKY_APP_PASSWORD || "")]);
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message.includes("Invalid")
            ? 400
            : isSocialPublishPendingError(error) ||
                message.includes("already published") ||
                message.includes("already running") ||
                message.includes("Missing BLUESKY") ||
                error instanceof BlueskyPublishError && ["authentication", "readiness"].includes(error.phase)
              ? 409
              : 500;
    if (status === 500) console.error("[admin/bluesky/publish]", message);
    return NextResponse.json({ error: message }, { status });
  }
}
