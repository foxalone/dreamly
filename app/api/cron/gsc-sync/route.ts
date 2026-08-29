import { NextResponse } from "next/server";

import { requireCronSecret, syncGscQueries } from "@/app/api/admin/_lib/gsc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    requireCronSecret(request);
    const result = await syncGscQueries();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("not configured") ? 503 : 500;
    if (status === 500) console.error("[cron/gsc-sync]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
