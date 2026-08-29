import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getGscStatus } from "@/app/api/admin/_lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getGscStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/gsc/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
