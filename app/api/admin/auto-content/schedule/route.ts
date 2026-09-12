import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { readAutoPairState, scheduleReadyAutoDictionaryPair } from "@/app/api/admin/_lib/autoContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status =
    message === "UNAUTHENTICATED"
      ? 401
      : message === "FORBIDDEN"
        ? 403
        : message === "AUTO_PAIR_NOT_READY" || message === "AUTO_PAIR_FAILED"
          ? 409
          : 500;
  if (status === 500) console.error("[admin/auto-content/schedule]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to schedule auto content" : message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const videoJobId = String(url.searchParams.get("videoJobId") || "").trim();
    const imageJobId = String(url.searchParams.get("imageJobId") || "").trim();
    if (!videoJobId || !imageJobId) {
      return NextResponse.json({ error: "videoJobId and imageJobId are required" }, { status: 400 });
    }
    return NextResponse.json(await readAutoPairState(videoJobId, imageJobId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json().catch(() => ({}))) as {
      slug?: unknown;
      videoJobId?: unknown;
      imageJobId?: unknown;
      publishAt?: unknown;
    };
    const slug = String(payload.slug || "").trim();
    const videoJobId = String(payload.videoJobId || "").trim();
    const imageJobId = String(payload.imageJobId || "").trim();
    const publishAt = String(payload.publishAt || "").trim();
    if (!slug || !videoJobId || !imageJobId || !publishAt) {
      return NextResponse.json({ error: "slug, videoJobId, imageJobId and publishAt are required" }, { status: 400 });
    }
    const result = await scheduleReadyAutoDictionaryPair({
      slug,
      videoJobId,
      imageJobId,
      publishAt,
      createdBy: uid,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
