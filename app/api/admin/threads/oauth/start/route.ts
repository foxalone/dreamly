import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { createThreadsOAuthStart } from "@/app/api/admin/threads/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const started = await createThreadsOAuthStart(adminUid);
    return NextResponse.json(started);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : message.includes("not configured") ? 503 : 500;
    if (status === 500) console.error("[admin/threads/oauth/start]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
