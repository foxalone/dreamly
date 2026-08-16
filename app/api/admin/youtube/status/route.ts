import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getYouTubeStatus } from "@/app/api/admin/youtube/_lib";
import { youtubeRedirectUri } from "@/lib/adminYouTube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getYouTubeStatus();
    return NextResponse.json({
      ...status,
      redirectUri: youtubeRedirectUri(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/youtube/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
