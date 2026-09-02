import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getBlueskyStatus } from "@/app/api/admin/bluesky/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await getBlueskyStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/bluesky/status]", error);
    return NextResponse.json({ error: status === 500 ? "Bluesky status unavailable" : message }, { status });
  }
}
