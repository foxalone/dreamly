import { FieldValue } from "firebase-admin/firestore";

import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  QUEUED_SCHEDULE_PLATFORMS,
  type AdminVideoPlatform,
  type AdminVideoScheduleStatus,
} from "@/lib/adminVideoLibrary";
import { buildPublishLogEntry } from "@/lib/socialPublishLog";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { trackSocialPublishes } from "@/app/api/admin/_lib/notionPublishLog";
import { notifyTelegram } from "@/app/api/admin/_lib/telegram";
import { publishLibraryVideoToMeta } from "@/app/api/admin/meta/_lib";
import { publishLibraryVideoToPinterest } from "@/app/api/admin/pinterest/_lib";
import { publishLibraryVideoToThreads } from "@/app/api/admin/threads/_lib";
import { publishLibraryVideoToTikTok } from "@/app/api/admin/tiktok/_lib";
import { normalizePublishAt, publishLibraryVideoToYouTube } from "@/app/api/admin/youtube/_lib";

const LIBRARY_COLLECTIONS = ["adminVideoJobs", AI_VIDEO_COLLECTION];

// A claim older than this is treated as a crashed run and may be retaken.
const SCHEDULE_LOCK_MS = 20 * 60 * 1000;
// One cron tick never handles more than this, so a backlog drains over
// several ticks instead of blowing the function timeout.
const SCHEDULE_BATCH_LIMIT = 4;

export type ScheduleJobData = {
  socialScheduledAt?: string;
  socialScheduledPlatforms?: string[];
  socialScheduleStatus?: string;
  socialScheduleStartedAt?: string;
  socialScheduleError?: string;
  youtubeMetadata?: { title?: string };
  topic?: string;
} & Record<string, unknown>;

function parseLibraryId(libraryId: string) {
  const [rawKind, rawId] = libraryId.split(":");
  if (!rawId || (rawKind !== "free" && rawKind !== "ai")) throw new Error("Invalid video id");
  return { rawId, collection: rawKind === "free" ? "adminVideoJobs" : AI_VIDEO_COLLECTION };
}

function libraryIdFor(collection: string, docId: string) {
  return `${collection === "adminVideoJobs" ? "free" : "ai"}:${docId}`;
}

function videoTitle(data: ScheduleJobData) {
  return String(data.youtubeMetadata?.title || data.topic || "Untitled video").trim();
}

export function scheduleStatusFrom(data: ScheduleJobData): AdminVideoScheduleStatus {
  const status = String(data.socialScheduleStatus || "");
  if (status === "pending" || status === "running" || status === "done" || status === "failed") return status;
  return "idle";
}

export function scheduledPlatformsFrom(data: ScheduleJobData): AdminVideoPlatform[] {
  const raw = Array.isArray(data.socialScheduledPlatforms) ? data.socialScheduledPlatforms : [];
  return raw
    .map((entry) => String(entry) as AdminVideoPlatform)
    .filter((entry) => QUEUED_SCHEDULE_PLATFORMS.includes(entry));
}

function alreadyPublished(data: ScheduleJobData, platform: AdminVideoPlatform) {
  return Boolean(String(data[`${platform}PublishedAt`] || ""));
}

async function publishOne(libraryId: string, platform: AdminVideoPlatform, adminUid: string) {
  if (platform === "tiktok") return publishLibraryVideoToTikTok(libraryId, adminUid);
  if (platform === "instagram" || platform === "facebook") {
    return publishLibraryVideoToMeta(libraryId, adminUid, platform);
  }
  if (platform === "threads") return publishLibraryVideoToThreads(libraryId, adminUid);
  if (platform === "pinterest") return publishLibraryVideoToPinterest(libraryId, adminUid);
  throw new Error(`Platform ${platform} is not queued`);
}

// Every queued platform gets a Positioner row the moment it is scheduled, so
// the journal shows the planned slot instead of nothing until the video goes
// out. The real publish later reuses the same key and flips it to
// "Опубликовано" with the actual timestamp.
async function trackScheduled(
  libraryId: string,
  platforms: AdminVideoPlatform[],
  title: string,
  publishAt: string,
  status: "Запланировано" | "Отменено",
) {
  if (!platforms.length) return;
  const note = status === "Запланировано" ? "scheduled" : "schedule cancelled";
  // One request for the whole batch: Positioner rewrites its file per request,
  // so five parallel posts would drop most of the rows.
  await trackSocialPublishes(
    platforms.map((platform) =>
      buildPublishLogEntry({
        kind: "video",
        assetId: libraryId,
        platform,
        title,
        publishedAt: publishAt,
        status,
        notes: `video ${libraryId} ${note}`,
      }),
    ),
  ).catch((error) => {
    console.error("[social-schedule] positioner", libraryId, error);
  });
}

export async function scheduleLibraryVideoPublish(
  libraryId: string,
  platforms: AdminVideoPlatform[],
  publishAtInput: string,
  adminUid: string,
) {
  const publishAt = normalizePublishAt(publishAtInput);
  if (!publishAt) throw new Error("Scheduled time is required");

  const { rawId, collection } = parseLibraryId(libraryId);
  const ref = adminDb().collection(collection).doc(rawId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Video not found");
  const data = snapshot.data() as ScheduleJobData;

  const queued = platforms.filter(
    (platform) => QUEUED_SCHEDULE_PLATFORMS.includes(platform) && !alreadyPublished(data, platform),
  );
  const wantsYouTube = platforms.includes("youtube");

  const failed: { platform: AdminVideoPlatform; error: string }[] = [];
  let youtubeScheduled = false;

  // YouTube schedules itself: the file goes up private now and YouTube flips it
  // public at publishAt, so it never needs the worker.
  if (wantsYouTube) {
    try {
      await publishLibraryVideoToYouTube(libraryId, adminUid, publishAt);
      youtubeScheduled = true;
    } catch (error) {
      failed.push({ platform: "youtube", error: error instanceof Error ? error.message : "YouTube error" });
    }
  }

  if (queued.length) {
    await ref.set(
      {
        socialScheduledAt: publishAt,
        socialScheduledPlatforms: queued,
        socialScheduleStatus: "pending",
        socialScheduleBy: adminUid,
        socialScheduleError: "",
        socialScheduleStartedAt: "",
      },
      { merge: true },
    );
    await trackScheduled(libraryId, queued, videoTitle(data), publishAt, "Запланировано");
  }

  if (!queued.length && !youtubeScheduled) {
    throw new Error(failed[0]?.error || "Нет площадок для планирования");
  }

  return {
    ok: true as const,
    scheduledAt: publishAt,
    queued,
    youtubeScheduled,
    failed,
  };
}

export async function cancelLibraryVideoSchedule(libraryId: string) {
  const { rawId, collection } = parseLibraryId(libraryId);
  const ref = adminDb().collection(collection).doc(rawId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Video not found");
  const data = snapshot.data() as ScheduleJobData;

  const scheduledAt = String(data.socialScheduledAt || "");
  const platforms = scheduledPlatformsFrom(data);
  if (!scheduledAt || scheduleStatusFrom(data) === "running") {
    throw new Error("Нечего отменять");
  }

  await ref.set(
    {
      socialScheduledAt: FieldValue.delete(),
      socialScheduledPlatforms: [],
      socialScheduleStatus: "idle",
      socialScheduleStartedAt: "",
      socialScheduleError: "",
    },
    { merge: true },
  );
  await trackScheduled(libraryId, platforms, videoTitle(data), scheduledAt, "Отменено");
  return { ok: true as const, cancelled: platforms };
}

async function claimDueJob(collection: string, docId: string, nowMs: number) {
  const ref = adminDb().collection(collection).doc(docId);
  return adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data() as ScheduleJobData;
    const dueAt = Date.parse(String(data.socialScheduledAt || ""));
    if (!Number.isFinite(dueAt) || dueAt > nowMs) return null;

    const status = scheduleStatusFrom(data);
    if (status === "running") {
      const lockedAt = Date.parse(String(data.socialScheduleStartedAt || "")) || 0;
      if (nowMs - lockedAt < SCHEDULE_LOCK_MS) return null;
    } else if (status !== "pending") {
      return null;
    }

    const platforms = scheduledPlatformsFrom(data).filter((platform) => !alreadyPublished(data, platform));
    if (!platforms.length) {
      transaction.set(
        ref,
        {
          socialScheduledAt: FieldValue.delete(),
          socialScheduledPlatforms: [],
          socialScheduleStatus: "done",
          socialScheduleStartedAt: "",
        },
        { merge: true },
      );
      return null;
    }

    transaction.set(
      ref,
      { socialScheduleStatus: "running", socialScheduleStartedAt: new Date(nowMs).toISOString() },
      { merge: true },
    );
    return { platforms, data };
  });
}

async function runDueJob(collection: string, docId: string, nowMs: number) {
  const claim = await claimDueJob(collection, docId, nowMs);
  if (!claim) return null;

  const libraryId = libraryIdFor(collection, docId);
  const ref = adminDb().collection(collection).doc(docId);
  const published: AdminVideoPlatform[] = [];
  const failed: { platform: AdminVideoPlatform; error: string }[] = [];

  // Sequential on purpose: one video is downloaded and re-uploaded per
  // platform, and the providers rate-limit bursts from the same account.
  for (const platform of claim.platforms) {
    try {
      await publishOne(libraryId, platform, "scheduler");
      published.push(platform);
    } catch (error) {
      failed.push({ platform, error: error instanceof Error ? error.message : "Ошибка публикации" });
    }
  }

  await ref.set(
    {
      socialScheduledAt: FieldValue.delete(),
      socialScheduledPlatforms: [],
      socialScheduleStatus: failed.length ? "failed" : "done",
      socialScheduleStartedAt: "",
      socialScheduleFinishedAt: new Date().toISOString(),
      socialScheduleError: failed.map((entry) => `${entry.platform}: ${entry.error}`).join("; ").slice(0, 500),
    },
    { merge: true },
  );

  // A scheduled publish runs while nobody is watching the dashboard, so a
  // failure has to come and find the admin instead of waiting on a card.
  if (failed.length) {
    const title = videoTitle(claim.data) || libraryId;
    await notifyTelegram(
      [
        `❌ Отложенная публикация не удалась`,
        title,
        published.length ? `Вышло: ${published.join(", ")}` : "Не вышло ни на одной площадке",
        ...failed.map((entry) => `• ${entry.platform}: ${entry.error}`),
        `Повторить можно с карточки в админке: ${libraryId}`,
      ].join("\n"),
    );
  }

  return { libraryId, published, failed };
}

export async function runDueSocialPublishes(limit = SCHEDULE_BATCH_LIMIT) {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const due: { collection: string; docId: string }[] = [];

  // Single-field range filter only, so Firestore's automatic index covers it
  // and no composite index has to be deployed.
  for (const collection of LIBRARY_COLLECTIONS) {
    const snapshot = await adminDb()
      .collection(collection)
      .where("socialScheduledAt", "<=", nowIso)
      .orderBy("socialScheduledAt", "asc")
      .limit(limit * 3)
      .get();
    for (const doc of snapshot.docs) due.push({ collection, docId: doc.id });
  }

  const results: { libraryId: string; published: string[]; failed: { platform: string; error: string }[] }[] = [];
  for (const entry of due) {
    if (results.length >= limit) break;
    const result = await runDueJob(entry.collection, entry.docId, nowMs);
    if (result) results.push(result);
  }

  return {
    ranAt: nowIso,
    checked: due.length,
    processed: results.length,
    results,
  };
}
