import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { getMetaStatus } from "@/app/api/admin/meta/_lib";
import { metaRedirectUri } from "@/lib/adminMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = await getMetaStatus();
    return NextResponse.json({
      ...status,
      redirectUri: metaRedirectUri(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/meta/status]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
