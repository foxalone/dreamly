import { NextResponse } from "next/server";
import { AI_IMAGE_COLLECTION, sourceLabelForImage, type AiImageProvider } from "@/lib/adminAiImage";
import type { AdminImageLibraryItem, AdminImagePublishState } from "@/lib/adminImageLibrary";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { captionForImage, loadImageJobSlugMap, resolveDreamSlug } from "@/app/api/admin/_lib/libraryImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIBRARY_LIMIT = 120;

function iso(value: { toDate?: () => Date } | undefined) {
  return value?.toDate?.()?.toISOString() ?? null;
}

type PublishFields = {
  instagramPublishedAt?: string;
  facebookPublishedAt?: string;
  threadsPublishedAt?: string;
  threadsStatus?: string;
  threadsError?: string;
  pinterestPublishedAt?: string;
  pinterestStatus?: string;
  pinterestError?: string;
  pinterestPinId?: string;
};

function publishedFrom(data: PublishFields) {
  return {
    instagram: Boolean(data.instagramPublishedAt),
    facebook: Boolean(data.facebookPublishedAt),
    threads: Boolean(data.threadsPublishedAt),
    pinterest: Boolean(data.pinterestPublishedAt),
  };
}

function stateFrom(publishedAt: string | undefined, status: string | undefined): AdminImagePublishState {
  if (publishedAt) return "published";
  if (status === "publishing" || status === "failed" || status === "published") return status;
  return "idle";
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [snapshot, slugMap] = await Promise.all([
      adminDb().collection(AI_IMAGE_COLLECTION).orderBy("createdAt", "desc").limit(LIBRARY_LIMIT).get(),
      loadImageJobSlugMap(),
    ]);
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
      } & PublishFields;
      const imageUrl = String(data.imageUrl || "");
      if (data.status !== "completed" || !imageUrl) continue;
      const source: AiImageProvider = data.provider === "veo" ? "veo" : "sora";
      const subject = String(data.subject || data.prompt || "");
      const target = captionForImage(resolveDreamSlug(subject, slugMap.get(doc.id) || ""), subject);
      items.push({
        id: doc.id,
        subject,
        prompt: String(data.prompt || ""),
        source,
        sourceLabel: sourceLabelForImage(source),
        imageUrl,
        mimeType: String(data.mimeType || "image/png"),
        estimatedCostUsd: Number(data.estimatedCostUsd ?? 0),
        actualCostUsd: data.actualCostUsd == null ? null : Number(data.actualCostUsd),
        createdAt: iso(data.createdAt) ?? new Date(0).toISOString(),
        dreamSlug: target.slug,
        pageUrl: target.pageUrl,
        published: publishedFrom(data),
        threadsState: stateFrom(data.threadsPublishedAt, data.threadsStatus),
        threadsError: String(data.threadsError || ""),
        pinterestState: stateFrom(data.pinterestPublishedAt, data.pinterestStatus),
        pinterestError: String(data.pinterestError || ""),
        pinterestPinId: String(data.pinterestPinId || ""),
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
