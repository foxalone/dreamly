import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { listStoredGscQueries } from "@/app/api/admin/_lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const limitN = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 250) || 250));
    const sortParam = url.searchParams.get("sort");
    const sort = sortParam === "impressions" ? "impressions" : "clicks";

    const rows = await listStoredGscQueries(limitN, sort);
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/gsc/queries]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
