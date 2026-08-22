import { NextResponse } from "next/server";
import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

function downloadFilename(prompt: string, jobId: string, mimeType: string) {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const extension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  return `${slug || jobId}.${extension}`;
}

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    await requireAdmin(request);
    const { jobId } = await context.params;
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(jobId)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const snapshot = await adminDb().collection(AI_IMAGE_COLLECTION).doc(jobId).get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const data = snapshot.data() as { imageUrl?: string; prompt?: string; status?: string; mimeType?: string };
    const imageUrl = String(data.imageUrl || "");
    if (!imageUrl || data.status !== "completed") {
      return NextResponse.json({ error: "Image is not ready for download" }, { status: 409 });
    }

    const upstream = await fetch(imageUrl, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Failed to fetch image file" }, { status: 502 });
    }

    const mimeType = String(data.mimeType || upstream.headers.get("Content-Type") || "image/png");
    const filename = downloadFilename(String(data.prompt || ""), jobId, mimeType);
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message === "UNAUTHENTICATED" || message === "FORBIDDEN" ? message : "Download failed" }, { status });
  }
}
