import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  sourceLabelFor,
  type AdminVideoLibraryItem,
  type AdminVideoLibrarySource,
  type AdminVideoPublishState,
} from "@/lib/adminVideoLibrary";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { scheduleStatusFrom, scheduledPlatformsFrom, type ScheduleJobData } from "@/app/api/admin/_lib/socialSchedule";
import { adminDb, adminRtdb, ensureAdmin } from "@/app/api/admin/_lib/firebaseAdmin";
import {
  SOCIAL_SCHEDULE_ASSETS_NODE,
  SOCIAL_SCHEDULE_FIELD,
  isProcessingPublishStatus,
  queueIdForLibraryId,
  readScheduleNode,
} from "@/lib/socialScheduleQueue";

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
  tiktokStatus?: string;
  tiktokError?: string;
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
  socialScheduledAt?: string;
  socialScheduledPlatforms?: string[];
  socialScheduleStatus?: string;
  socialScheduleError?: string;
};

function tiktokStateFrom(data: PublishFields): AdminVideoPublishState {
  if (data.tiktokPublishedAt) return "published";
  const status = String(data.tiktokStatus || "");
  if (status === "publishing" || status === "failed" || status === "published") return status;
  return "idle";
}

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

// The "All" batch queued on a video: one moment shared by every platform that
// has no native scheduling of its own.
function scheduleFrom(data: PublishFields) {
  const raw = data as ScheduleJobData;
  return {
    scheduledAt: String(data.socialScheduledAt || ""),
    scheduledPlatforms: scheduledPlatformsFrom(raw),
    scheduleStatus: scheduleStatusFrom(raw),
    scheduleError: String(data.socialScheduleError || ""),
  };
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
        tiktokStatus?: string;
        tiktokError?: string;
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
        socialScheduledAt?: string;
        socialScheduledPlatforms?: string[];
        socialScheduleStatus?: string;
        socialScheduleError?: string;
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
        tiktokState: tiktokStateFrom(data),
        tiktokError: String(data.tiktokError || ""),
        threadsState: threadsStateFrom(data),
        threadsError: String(data.threadsError || ""),
        youtubeState: youtubeStateFrom(data),
        youtubeError: String(data.youtubeError || ""),
        youtubeVideoId: String(data.youtubeVideoId || ""),
        youtubeScheduledAt: String(data.youtubeScheduledAt || ""),
        pinterestState: pinterestStateFrom(data),
        pinterestError: String(data.pinterestError || ""),
        pinterestPinId: String(data.pinterestPinId || ""),
        ...scheduleFrom(data),
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
        tiktokStatus?: string;
        tiktokError?: string;
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
        socialScheduledAt?: string;
        socialScheduledPlatforms?: string[];
        socialScheduleStatus?: string;
        socialScheduleError?: string;
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
        tiktokState: tiktokStateFrom(data),
        tiktokError: String(data.tiktokError || ""),
        threadsState: threadsStateFrom(data),
        threadsError: String(data.threadsError || ""),
        youtubeState: youtubeStateFrom(data),
        youtubeError: String(data.youtubeError || ""),
        youtubeVideoId: String(data.youtubeVideoId || ""),
        youtubeScheduledAt: String(data.youtubeScheduledAt || ""),
        pinterestState: pinterestStateFrom(data),
        pinterestError: String(data.pinterestError || ""),
        pinterestPinId: String(data.pinterestPinId || ""),
        ...scheduleFrom(data),
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

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { libraryId?: string };
    const libraryId = String(body.libraryId || "").trim();
    if (!/^(free|ai):[A-Za-z0-9_-]{6,128}$/.test(libraryId)) {
      return NextResponse.json({ error: "Invalid libraryId" }, { status: 400 });
    }

    const [kind, jobId] = libraryId.split(":") as ["free" | "ai", string];
    const collection = kind === "free" ? "adminVideoJobs" : AI_VIDEO_COLLECTION;
    const jobRef = adminDb().collection(collection).doc(jobId);
    const queueRef = adminRtdb().ref(`${SOCIAL_SCHEDULE_ASSETS_NODE}/${queueIdForLibraryId(libraryId)}`);
    const [snapshot, queueSnapshot] = await Promise.all([jobRef.get(), queueRef.get()]);
    if (!snapshot.exists) {
      return NextResponse.json({ error: "Видео уже удалено" }, { status: 404 });
    }

    const data = snapshot.data() as Record<string, unknown>;
    const queuedSchedule = readScheduleNode(queueSnapshot.child(SOCIAL_SCHEDULE_FIELD).val());
    const publicationRunning =
      data.socialScheduleStatus === "running" ||
      queuedSchedule?.status === "running" ||
      data.youtubeStatus === "uploading" ||
      isProcessingPublishStatus(data.tiktokStatus) ||
      isProcessingPublishStatus(data.instagramStatus) ||
      isProcessingPublishStatus(data.facebookStatus) ||
      isProcessingPublishStatus(data.threadsStatus) ||
      isProcessingPublishStatus(data.youtubeStatus);
    if (publicationRunning) {
      return NextResponse.json(
        { error: "Сейчас видео публикуется. Дождитесь окончания публикации и повторите удаление." },
        { status: 409 },
      );
    }

    const storagePaths =
      kind === "free"
        ? [`admin-videos/${jobId}.mp4`]
        : [`admin-ai-videos/${jobId}/video.mp4`, `admin-ai-videos/${jobId}/thumbnail.jpg`];
    const bucket = getStorage(ensureAdmin()).bucket();
    await Promise.all([
      ...storagePaths.map((storagePath) => bucket.file(storagePath).delete({ ignoreNotFound: true })),
      queueRef.remove(),
    ]);
    await jobRef.delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[admin/video-library:delete]", error);
    return NextResponse.json({ error: status === 500 ? "Не удалось удалить видео" : message }, { status });
  }
}
