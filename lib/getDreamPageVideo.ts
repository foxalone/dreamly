import { cache } from "react";
import { optionalPageData } from "@/lib/optionalPageData";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { getDreamEntry } from "@/lib/dream-dictionary";
import { DREAM_PAGE_VIDEO_COLLECTION, type DreamPageVideo } from "@/lib/dreamPageVideo";

export function dreamPageVideoFromData(slug: string, data: Record<string, unknown> | undefined): DreamPageVideo | null {
  const youtubeId = String(data?.youtubeId || "");
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return null;
  return {
    slug,
    youtubeId,
    title: String(data?.title || ""),
    description: String(data?.description || ""),
    thumbnailUrl: String(data?.thumbnailUrl || ""),
    uploadDate: String(data?.uploadDate || ""),
    duration: String(data?.duration || ""),
  };
}

export async function readDreamPageVideo(slug: string): Promise<DreamPageVideo | null> {
  const cleaned = slug.trim();
  if (!cleaned || !getDreamEntry(cleaned)) return null;
  // Keep read errors distinct from missing assignments; the public wrapper
  // below handles outages without caching a degraded article.
  const snapshot = await adminDb().collection(DREAM_PAGE_VIDEO_COLLECTION).doc(cleaned).get();
  return snapshot.exists ? dreamPageVideoFromData(cleaned, snapshot.data()) : null;
}

export const getDreamPageVideo = cache((slug: string) =>
  optionalPageData("video", () => readDreamPageVideo(slug), null),
);
