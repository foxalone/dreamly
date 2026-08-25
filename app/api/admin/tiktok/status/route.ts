import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { bufferTikTokReadiness } from "@/lib/adminTikTok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Env-only TikTok readiness. Does not call Buffer (status polls must not burn quota). */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = bufferTikTokReadiness();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const code = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (code === 500) console.error("[admin/tiktok/status]", message);
    return NextResponse.json({ error: message }, { status: code });
  }
}
