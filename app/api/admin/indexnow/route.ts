import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { readIndexNowState, submitAllIndexNow, submitChangedIndexNow, submitOneIndexNow } from "@/app/api/admin/_lib/indexnow";
import { INDEXNOW_HOST, indexNowKeyLocation, isIndexNowConfigured } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "URL_NOT_INDEXABLE") {
    return NextResponse.json({ error: "URL не с dreamly.art или не индексируемая страница" }, { status: 400 });
  }
  if (message === "URL_NOT_PUBLIC") {
    return NextResponse.json({ error: "Такой публичной страницы нет в sitemap" }, { status: 400 });
  }
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : message.includes("not configured") ? 503 : 500;
  if (status === 500) console.error("[admin/indexnow]", error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const configured = isIndexNowConfigured();
    return NextResponse.json({
      configured,
      host: INDEXNOW_HOST,
      keyLocation: configured ? indexNowKeyLocation() : "",
      state: configured ? await readIndexNowState().catch(() => null) : null,
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * body { url }               → submit exactly one existing public URL (manual test)
 * body { mode: "changed" }   → same diff the daily cron runs
 * body { mode: "all" }       → whole inventory (only on demand, e.g. after a key rotation)
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { mode?: unknown; url?: unknown };
    if (typeof body.url === "string" && body.url.trim()) {
      return NextResponse.json(await submitOneIndexNow(body.url));
    }
    if (body.mode === "all") return NextResponse.json(await submitAllIndexNow());
    return NextResponse.json(await submitChangedIndexNow());
  } catch (error) {
    return apiError(error);
  }
}
