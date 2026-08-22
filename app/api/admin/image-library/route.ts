import { NextResponse } from "next/server";
import { AI_IMAGE_COLLECTION, sourceLabelForImage, type AiImageProvider } from "@/lib/adminAiImage";
import type { AdminImageLibraryItem } from "@/lib/adminImageLibrary";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIBRARY_LIMIT = 120;

function iso(value: { toDate?: () => Date } | undefined) {
  return value?.toDate?.()?.toISOString() ?? null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await adminDb().collection(AI_IMAGE_COLLECTION).orderBy("createdAt", "desc").limit(LIBRARY_LIMIT).get();
    const items: AdminImageLibraryItem[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data() as {
        status?: string;
        subject?: string;
        prompt?: string;
        provider?: string;
        imageUrl?: string;
        mimeType?: string;
        estimatedCostUsd?: number;
        actualCostUsd?: number | null;
        createdAt?: { toDate?: () => Date };
      };
      const imageUrl = String(data.imageUrl || "");
      if (data.status !== "completed" || !imageUrl) continue;
      const source: AiImageProvider = data.provider === "veo" ? "veo" : "sora";
      items.push({
        id: doc.id,
        subject: String(data.subject || data.prompt || ""),
        prompt: String(data.prompt || ""),
        source,
        sourceLabel: sourceLabelForImage(source),
        imageUrl,
        mimeType: String(data.mimeType || "image/png"),
        estimatedCostUsd: Number(data.estimatedCostUsd ?? 0),
        actualCostUsd: data.actualCostUsd == null ? null : Number(data.actualCostUsd),
        createdAt: iso(data.createdAt) ?? new Date(0).toISOString(),
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/image-library]", error);
    return NextResponse.json({ error: status === 500 ? "Unable to load image library" : message }, { status });
  }
}
