import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getTumblrStatus } from "@/app/api/admin/tumblr/_lib";
import { tumblrRedirectUri } from "@/lib/adminTumblr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    // getTumblrStatus never returns tokens, so this payload is safe to render.
    const status = await getTumblrStatus();
    return NextResponse.json({
      ...status,
      redirectUri: tumblrRedirectUri(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/tumblr/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
