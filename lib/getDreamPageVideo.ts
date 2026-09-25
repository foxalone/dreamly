import { cache } from "react";
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
  // Like the page image: a failed read throws so ISR keeps the last good page.
  const snapshot = await adminDb().collection(DREAM_PAGE_VIDEO_COLLECTION).doc(cleaned).get();
  return snapshot.exists ? dreamPageVideoFromData(cleaned, snapshot.data()) : null;
}

export const getDreamPageVideo = cache(readDreamPageVideo);
