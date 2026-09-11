import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { INDEXNOW_KEY, indexNowKeyLocation, submitPublicIndexNow, type IndexNowMode } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseMode(value: unknown): IndexNowMode {
  return value === "all" ? "all" : "recent";
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return NextResponse.json({
      configured: true,
      host: "dreamly.art",
      key: INDEXNOW_KEY,
      keyLocation: indexNowKeyLocation(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/indexnow]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { mode?: unknown };
    const result = await submitPublicIndexNow(parseMode(body.mode));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/indexnow]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
