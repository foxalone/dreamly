import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getThreadsStatus } from "@/app/api/admin/threads/_lib";
import { threadsRedirectUri } from "@/lib/adminThreads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getThreadsStatus();
    return NextResponse.json({
      ...status,
      redirectUri: threadsRedirectUri(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/threads/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
