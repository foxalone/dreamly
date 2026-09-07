import { NextResponse } from "next/server";
import { IMAGE_JOB_ID_PATTERN } from "@/app/api/admin/_lib/libraryImage";
import { publishLibraryImageToAll } from "@/app/api/admin/_lib/publishLibraryImageAll";
import { requireAdmin } from "@/app/api/admin/_lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { libraryId?: string };
    const libraryId = String(body.libraryId || "").trim();
    if (!IMAGE_JOB_ID_PATTERN.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }

    const results = await publishLibraryImageToAll(libraryId, adminUid);
    const published = results.filter((entry) => entry.status === "published").map((entry) => entry.platform);
    const skipped = results.filter((entry) => entry.status === "skipped").map((entry) => entry.platform);
    const failed = results
      .filter((entry) => entry.status === "failed")
      .map((entry) => ({ platform: entry.platform, error: entry.error || "ошибка" }));

    return NextResponse.json({
      ok: failed.length === 0,
      published,
      skipped,
      failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/image-library/publish-all]", error);
    return NextResponse.json({ error: status === 500 ? "Unable to publish image" : message }, { status });
  }
}
