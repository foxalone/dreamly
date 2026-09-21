import { NextResponse } from "next/server";

import { requireCronSecret } from "@/app/api/admin/_lib/gsc";
import { submitChangedIndexNow } from "@/app/api/admin/_lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily: submit only public pages that were created, changed or removed since the last acknowledged inventory. */
export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const result = await submitChangedIndexNow();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("not configured") ? 503 : 500;
    if (status === 500) console.error("[cron/indexnow]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
