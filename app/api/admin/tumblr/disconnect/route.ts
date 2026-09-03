import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { resetTumblrConnection } from "@/app/api/admin/tumblr/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Drops the stored OAuth credentials and the blog selection. Posts that are
// already live on Tumblr are never touched.
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    await resetTumblrConnection();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/tumblr/disconnect]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
