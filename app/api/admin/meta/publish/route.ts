import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { publishLibraryVideoToMeta, type MetaPublishTarget } from "@/app/api/admin/meta/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const adminUid = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { libraryId?: string; target?: string };
    const libraryId = String(body.libraryId || "").trim();
    const target = String(body.target || "").trim() as MetaPublishTarget;
    if (!/^(free|ai):[A-Za-z0-9_-]{6,128}$/.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }
    if (target !== "instagram" && target !== "facebook") {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    const result = await publishLibraryVideoToMeta(libraryId, adminUid, target);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : message.includes("not connected") || message.includes("not configured") || message.includes("not linked")
            ? 409
            : 500;
    if (status === 500) console.error("[admin/meta/publish]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
