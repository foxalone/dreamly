import { NextResponse } from "next/server";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  sourceLabelFor,
  type AdminVideoLibraryItem,
  type AdminVideoLibrarySource,
  type AdminVideoPublishState,
} from "@/lib/adminVideoLibrary";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIBRARY_LIMIT = 120;

function iso(value: { toDate?: () => Date } | undefined) {
  return value?.toDate?.()?.toISOString() ?? null;
}

function titleFrom(topic: string, youtubeTitle?: string) {
  const titled = String(youtubeTitle || "").trim();
  return titled || String(topic || "").trim() || "Untitled video";
}

type PublishFields = {
  tiktokPublishedAt?: string;
  instagramPublishedAt?: string;
  facebookPublishedAt?: string;
  threadsPublishedAt?: string;
  threadsStatus?: string;
  threadsError?: string;
  youtubePublishedAt?: string;
  youtubeStatus?: string;
  youtubeError?: string;
  youtubeVideoId?: string;
  youtubeScheduledAt?: string;
  pinterestPublishedAt?: string;
  pinterestStatus?: string;
  pinterestError?: string;
  pinterestPinId?: string;
};

function publishedFrom(data: PublishFields) {
  return {
    tiktok: Boolean(data.tiktokPublishedAt),
    instagram: Boolean(data.instagramPublishedAt),
    facebook: Boolean(data.facebookPublishedAt),
    threads: Boolean(data.threadsPublishedAt),
    youtube: Boolean(data.youtubePublishedAt),
    pinterest: Boolean(data.pinterestPublishedAt),
  };
}

function threadsStateFrom(data: PublishFields): AdminVideoPublishState {
  if (data.threadsPublishedAt) return "published";
  const status = String(data.threadsStatus || "");
  if (status === "publishing" || status === "failed" || status === "published") return status;
  return "idle";
}

function youtubeStateFrom(data: PublishFields): AdminVideoPublishState {
  const status = String(data.youtubeStatus || "");
  if (status === "scheduled") return "scheduled";
  if (data.youtubePublishedAt) return "published";
  if (status === "uploading" || status === "publishing") return "uploading";
  if (status === "failed" || status === "published") return status;
  return "idle";
}

function pinterestStateFrom(data: PublishFields): AdminVideoPublishState {
  if (data.pinterestPublishedAt) return "published";
  const status = String(data.pinterestStatus || "");
  if (status === "publishing" || status === "failed" || status === "published") return status;
  return "idle";
}

function aiSource(mode: string): AdminVideoLibrarySource {
  if (mode === "preview") return "sora-preview";
  if (mode === "combined") return "combined";
  if (mode === "veo") return "veo";
  return "sora-standard";
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const [freeSnapshot, aiSnapshot] = await Promise.all([
      db.collection("adminVideoJobs").orderBy("createdAt", "desc").limit(LIBRARY_LIMIT).get(),
      db.collection(AI_VIDEO_COLLECTION).orderBy("createdAt", "desc").limit(LIBRARY_LIMIT).get(),
    ]);

    const items: AdminVideoLibraryItem[] = [];

    for (const doc of freeSnapshot.docs) {
      const data = doc.data() as {
        status?: string;
        mode?: string;
        topic?: string;
        videoUrl?: string;
        youtubeMetadata?: { title?: string };
        createdAt?: { toDate?: () => Date };
        tiktokPublishedAt?: string;
        instagramPublishedAt?: string;
        facebookPublishedAt?: string;
        threadsPublishedAt?: string;
        threadsStatus?: string;
        threadsError?: string;
        youtubePublishedAt?: string;
        youtubeStatus?: string;
        youtubeError?: string;
        youtubeVideoId?: string;
        youtubeScheduledAt?: string;
        pinterestPublishedAt?: string;
        pinterestStatus?: string;
        pinterestError?: string;
        pinterestPinId?: string;
      };
      const videoUrl = String(data.videoUrl || "");
      if (data.status !== "completed" || !videoUrl) continue;
      const source: AdminVideoLibrarySource = data.mode === "mixed" ? "free-mix" : "free";
      items.push({
        id: `free:${doc.id}`,
        title: titleFrom(String(data.topic || ""), data.youtubeMetadata?.title),
        topic: String(data.topic || ""),
        source,
        sourceLabel: sourceLabelFor(source),
        videoUrl,
        thumbnailUrl: "",
        createdAt: iso(data.createdAt) ?? new Date(0).toISOString(),
        published: publishedFrom(data),
        threadsState: threadsStateFrom(data),
        threadsError: String(data.threadsError || ""),
        youtubeState: youtubeStateFrom(data),
        youtubeError: String(data.youtubeError || ""),
        youtubeVideoId: String(data.youtubeVideoId || ""),
        youtubeScheduledAt: String(data.youtubeScheduledAt || ""),
        pinterestState: pinterestStateFrom(data),
        pinterestError: String(data.pinterestError || ""),
        pinterestPinId: String(data.pinterestPinId || ""),
      });
    }

    for (const doc of aiSnapshot.docs) {
      const data = doc.data() as {
        status?: string;
        topic?: string;
        mode?: string;
        videoUrl?: string;
        thumbnailUrl?: string;
        youtubeMetadata?: { title?: string };
        createdAt?: { toDate?: () => Date };
        tiktokPublishedAt?: string;
        instagramPublishedAt?: string;
        facebookPublishedAt?: string;
        threadsPublishedAt?: string;
        threadsStatus?: string;
        threadsError?: string;
        youtubePublishedAt?: string;
        youtubeStatus?: string;
        youtubeError?: string;
        youtubeVideoId?: string;
        youtubeScheduledAt?: string;
        pinterestPublishedAt?: string;
        pinterestStatus?: string;
        pinterestError?: string;
        pinterestPinId?: string;
      };
      const videoUrl = String(data.videoUrl || "");
      if (data.status !== "completed" || !videoUrl) continue;
      const source = aiSource(String(data.mode || "standard"));
      items.push({
        id: `ai:${doc.id}`,
        title: titleFrom(String(data.topic || ""), data.youtubeMetadata?.title),
        topic: String(data.topic || ""),
        source,
        sourceLabel: sourceLabelFor(source),
        videoUrl,
        thumbnailUrl: String(data.thumbnailUrl || ""),
        createdAt: iso(data.createdAt) ?? new Date(0).toISOString(),
        published: publishedFrom(data),
        threadsState: threadsStateFrom(data),
        threadsError: String(data.threadsError || ""),
        youtubeState: youtubeStateFrom(data),
        youtubeError: String(data.youtubeError || ""),
        youtubeVideoId: String(data.youtubeVideoId || ""),
        youtubeScheduledAt: String(data.youtubeScheduledAt || ""),
        pinterestState: pinterestStateFrom(data),
        pinterestError: String(data.pinterestError || ""),
        pinterestPinId: String(data.pinterestPinId || ""),
      });
    }

    items.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/video-library]", error);
    return NextResponse.json({ error: status === 500 ? "Unable to load video library" : message }, { status });
  }
}
