import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

function downloadFilename(topic: string, jobId: string) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || jobId}.mp4`;
}

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    await requireAdmin(request);
    const { jobId } = await context.params;
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(jobId)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const snapshot = await adminDb().collection("adminVideoJobs").doc(jobId).get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = snapshot.data() as { videoUrl?: string; topic?: string; status?: string };
    const videoUrl = String(data.videoUrl || "");
    if (!videoUrl || data.status !== "completed") {
      return NextResponse.json({ error: "Video is not ready for download" }, { status: 409 });
    }

    const upstream = await fetch(videoUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Failed to fetch video file" }, { status: 502 });
    }

    const filename = downloadFilename(String(data.topic || ""), jobId);
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json(
      { error: message === "UNAUTHENTICATED" || message === "FORBIDDEN" ? message : "Download failed" },
      { status },
    );
  }
}
