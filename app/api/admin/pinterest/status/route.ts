import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getPinterestStatus } from "@/app/api/admin/pinterest/_lib";
import { pinterestRedirectUri } from "@/lib/adminPinterest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getPinterestStatus();
    return NextResponse.json({
      ...status,
      redirectUri: pinterestRedirectUri(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/pinterest/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
