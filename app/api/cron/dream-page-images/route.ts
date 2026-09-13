import { NextResponse } from "next/server";
import { requireCronSecret } from "@/app/api/admin/_lib/gsc";
import { refreshDreamPageImageCache } from "@/app/api/admin/_lib/dreamPageImageCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    return NextResponse.json(await refreshDreamPageImageCache());
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("not configured") ? 503 : 500;
    if (status === 500) console.error("[cron/dream-page-images]", error);
    return NextResponse.json({ error: status === 500 ? "Cache refresh failed" : message }, { status });
  }
}
