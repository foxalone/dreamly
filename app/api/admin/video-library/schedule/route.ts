import { NextResponse } from "next/server";

import { QUEUED_SCHEDULE_PLATFORMS, type AdminVideoPlatform } from "@/lib/adminVideoLibrary";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { cancelLibraryVideoSchedule, scheduleLibraryVideoPublish } from "@/app/api/admin/_lib/socialSchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALL_PLATFORMS: AdminVideoPlatform[] = [...QUEUED_SCHEDULE_PLATFORMS, "youtube"];

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as {
      libraryId?: string;
      publishAt?: string;
      platforms?: string[];
      cancel?: boolean;
    };
    const libraryId = String(body.libraryId || "").trim();
    if (!/^(free|ai):[A-Za-z0-9_-]{6,128}$/.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }

    if (body.cancel) {
      const cancelled = await cancelLibraryVideoSchedule(libraryId);
      return NextResponse.json(cancelled);
    }

    const requested = Array.isArray(body.platforms) ? body.platforms.map((entry) => String(entry)) : [];
    const platforms = (requested.length ? requested : ALL_PLATFORMS).filter((entry): entry is AdminVideoPlatform =>
      ALL_PLATFORMS.includes(entry as AdminVideoPlatform),
    );
    if (!platforms.length) {
      return NextResponse.json({ error: "No platforms to schedule" }, { status: 400 });
    }

    const result = await scheduleLibraryVideoPublish(libraryId, platforms, String(body.publishAt || ""), adminUid);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message.includes("Invalid publish date") ||
              message.includes("Scheduled time must") ||
              message.includes("Scheduled time is required") ||
              message.includes("Invalid video id")
            ? 400
            : message.includes("not found") || message.includes("Нечего отменять") || message.includes("Нет площадок")
              ? 409
              : 500;
    if (status === 500) console.error("[admin/video-library/schedule]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
