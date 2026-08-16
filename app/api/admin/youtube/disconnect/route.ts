import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { resetYouTubeConnection } from "@/app/api/admin/youtube/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    await resetYouTubeConnection();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/youtube/disconnect]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
