import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getTikTokStatus } from "@/app/api/admin/tiktok/_lib";
import { tiktokRedirectUri } from "@/lib/adminTikTok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getTikTokStatus();
    return NextResponse.json({
      ...status,
      redirectUri: tiktokRedirectUri(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/tiktok/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
