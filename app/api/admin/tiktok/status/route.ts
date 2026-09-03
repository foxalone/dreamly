import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getTikTokStatus } from "@/app/api/admin/tiktok/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TikTok readiness plus our own 24h Buffer usage. Does not call Buffer. */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getTikTokStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const code = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (code === 500) console.error("[admin/tiktok/status]", message);
    return NextResponse.json({ error: message }, { status: code });
  }
}
