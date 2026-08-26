import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { backfillNotionPublishes, notionPublishLogConfigured } from "@/app/api/admin/_lib/notionPublishLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    if (!notionPublishLogConfigured()) {
      return NextResponse.json({ error: "Notion publish log is not configured" }, { status: 400 });
    }
    const result = await backfillNotionPublishes();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/notion/backfill]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
