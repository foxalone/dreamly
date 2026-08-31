import { FieldValue } from "firebase-admin/firestore";

import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  QUEUED_SCHEDULE_PLATFORMS,
  type AdminVideoPlatform,
  type AdminVideoScheduleStatus,
} from "@/lib/adminVideoLibrary";
import { buildPublishLogEntry } from "@/lib/socialPublishLog";
import {
  claimableSchedule,
  finishScheduleState,
  isProcessingPublishStatus,
  type SocialSchedulePlatform,
} from "@/lib/socialScheduleQueue";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { trackSocialPublishes } from "@/app/api/admin/_lib/notionPublishLog";
import { notifyTelegram } from "@/app/api/admin/_lib/telegram";
import { publishLibraryVideoToMeta } from "@/app/api/admin/meta/_lib";
import { publishLibraryVideoToPinterest } from "@/app/api/admin/pinterest/_lib";
import { publishLibraryVideoToThreads } from "@/app/api/admin/threads/_lib";
import { publishLibraryVideoToTikTok } from "@/app/api/admin/tiktok/_lib";
import { normalizePublishAt, publishLibraryVideoToYouTube } from "@/app/api/admin/youtube/_lib";

const LIBRARY_COLLECTIONS = ["adminVideoJobs", AI_VIDEO_COLLECTION];

// One cron tick never handles more than this, so a backlog drains over
// several ticks instead of blowing the function timeout.
const SCHEDULE_BATCH_LIMIT = 4;
// Vercel and the scheduled function both allow 300 seconds. Leave enough time
// to persist a retry state and return a useful response.
const SCHEDULE_BUDGET_MS = 240 * 1000;

export type ScheduleJobData = {
  socialScheduledAt?: string;
  socialScheduledPlatforms?: string[];
  socialScheduleStatus?: string;
  socialScheduleStartedAt?: string;
  socialScheduleError?: string;
  socialScheduleAttempts?: number;
  socialSchedulePublished?: string[];
  socialScheduleFailures?: Record<string, string>;
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
  let result: { status?: string } | null = null;
  if (platform === "tiktok") result = await publishLibraryVideoToTikTok(libraryId, adminUid);
  if (platform === "instagram" || platform === "facebook") {
    result = await publishLibraryVideoToMeta(libraryId, adminUid, platform, {
      deferProcessing: platform === "instagram",
    });
  }
  if (platform === "threads") {
    result = await publishLibraryVideoToThreads(libraryId, adminUid, { deferProcessing: true });
  }
  if (platform === "pinterest") result = await publishLibraryVideoToPinterest(libraryId, adminUid);
  if (!result) throw new Error(`Platform ${platform} is not queued`);
  return isProcessingPublishStatus(result.status) ? "processing" as const : "published" as const;
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
        socialScheduleAttempts: 0,
        socialSchedulePublished: [],
        socialScheduleFailures: {},
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
      socialScheduleAttempts: 0,
      socialSchedulePublished: [],
      socialScheduleFailures: {},
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
    if (!snapshot.exists) return { claimed: false as const, reason: "NOT_FOUND" };
    const data = snapshot.data() as ScheduleJobData;
    const claim = claimableSchedule(data, nowMs);
    if (!claim.claimable) {
      if (claim.reason === "EMPTY") {
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
      }
      return { claimed: false as const, reason: claim.reason };
    }

    if (!claim.platforms.length) {
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
      return { claimed: false as const, reason: "EMPTY" };
    }

    transaction.set(
      ref,
      { socialScheduleStatus: "running", socialScheduleStartedAt: new Date(nowMs).toISOString() },
      { merge: true },
    );
    return { claimed: true as const, ...claim, data };
  });
}

function scheduleErrorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Ошибка публикации");
}

function asAdminPlatforms(platforms: SocialSchedulePlatform[]) {
  return platforms as AdminVideoPlatform[];
}

async function runDueJob(collection: string, docId: string, nowMs: number, deadlineMs: number) {
  const claim = await claimDueJob(collection, docId, nowMs);
  if (!claim.claimed) return { claimed: false as const, reason: claim.reason };

  const libraryId = libraryIdFor(collection, docId);
  const ref = adminDb().collection(collection).doc(docId);
  const published = [...claim.published];
  const failed = { ...claim.failures };
  const pending: SocialSchedulePlatform[] = [];
  const untouched = [...claim.platforms];

  // Sequential on purpose: one video is downloaded and re-uploaded per
  // platform, and the providers rate-limit bursts from the same account.
  for (const platform of claim.platforms) {
    untouched.shift();
    if (Date.now() >= deadlineMs) {
      pending.push(platform, ...untouched);
      break;
    }

    try {
      // A manual publish may have completed after the schedule was claimed.
      // Re-read before calling the provider so that crossing those paths does
      // not create a duplicate.
      const current = (await ref.get()).data() as ScheduleJobData | undefined;
      if (!current || !alreadyPublished(current, platform as AdminVideoPlatform)) {
        const outcome = await publishOne(libraryId, platform as AdminVideoPlatform, "scheduler");
        if (outcome === "processing") {
          pending.push(platform);
          delete failed[platform];
        } else if (!published.includes(platform)) {
          published.push(platform);
        }
      } else if (!published.includes(platform)) {
        published.push(platform);
      }
      delete failed[platform];
    } catch (error) {
      failed[platform] = scheduleErrorText(error);
    }

    // Persist after every provider. If the process dies before the final
    // write, a stale retry sees only untouched platforms and never sends a
    // successful one twice.
    await ref.set(
      {
        socialScheduledPlatforms: [...pending, ...untouched],
        socialSchedulePublished: published,
        socialScheduleFailures: failed,
        socialScheduleError: Object.entries(failed)
          .map(([failedPlatform, message]) => `${failedPlatform}: ${message}`)
          .join("; ")
          .slice(0, 500),
      },
      { merge: true },
    );
  }

  const finish = finishScheduleState({
    published,
    failed,
    pending,
    attempts: claim.attempts,
  });
  const finishedAt = new Date().toISOString();
  await ref.set(
    {
      ...(finish.clearScheduledAt ? { socialScheduledAt: FieldValue.delete() } : {}),
      socialScheduledPlatforms: finish.platforms,
      socialScheduleStatus: finish.status,
      socialScheduleStartedAt: "",
      ...(finish.clearScheduledAt ? { socialScheduleFinishedAt: finishedAt } : {}),
      socialScheduleAttempts: finish.attempts,
      socialSchedulePublished: finish.published,
      socialScheduleFailures: finish.failed,
      socialScheduleError: Object.entries(finish.failed)
        .map(([platform, message]) => `${platform}: ${message}`)
        .join("; ")
        .slice(0, 500),
    },
    { merge: true },
  );

  // A scheduled publish runs while nobody is watching the dashboard, so a
  // failure has to come and find the admin instead of waiting on a card.
  const failedList = Object.entries(finish.failed).map(([platform, error]) => ({
    platform: platform as AdminVideoPlatform,
    error: String(error),
  }));
  if (finish.outcome === "failed") {
    const title = videoTitle(claim.data) || libraryId;
    await notifyTelegram(
      [
        `❌ Отложенная публикация не удалась`,
        title,
        published.length ? `Вышло: ${published.join(", ")}` : "Не вышло ни на одной площадке",
        ...failedList.map((entry) => `• ${entry.platform}: ${entry.error}`),
        `Повторить можно с карточки в админке: ${libraryId}`,
      ].join("\n"),
    );
  }

  return {
    claimed: true as const,
    item: {
      node: collection,
      id: docId,
      title: videoTitle(claim.data),
      scheduledAt: claim.scheduledAt,
      published: asAdminPlatforms(finish.published),
      failed: failedList,
      pending: asAdminPlatforms(finish.platforms),
      outcome: finish.outcome,
    },
  };
}

export async function runDueSocialPublishes(limit = SCHEDULE_BATCH_LIMIT) {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const deadlineMs = nowMs + SCHEDULE_BUDGET_MS;
  const found: { collection: string; docId: string; scheduledAt: string }[] = [];

  // Single-field range filter only, so Firestore's automatic index covers it
  // and no composite index has to be deployed.
  for (const collection of LIBRARY_COLLECTIONS) {
    const snapshot = await adminDb()
      .collection(collection)
      .where("socialScheduledAt", "<=", nowIso)
      .orderBy("socialScheduledAt", "asc")
      .limit(limit * 3)
      .get();
    for (const doc of snapshot.docs) {
      found.push({
        collection,
        docId: doc.id,
        scheduledAt: String((doc.data() as ScheduleJobData).socialScheduledAt || ""),
      });
    }
  }

  const due = found
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
    .slice(0, Math.max(1, limit));
  const selectedByNode = Object.fromEntries(LIBRARY_COLLECTIONS.map((collection) => [collection, 0]));
  for (const entry of due) selectedByNode[entry.collection] += 1;

  const items: Array<{
    node: string;
    id: string;
    title: string;
    scheduledAt: string;
    published: AdminVideoPlatform[];
    failed: { platform: AdminVideoPlatform; error: string }[];
    pending: AdminVideoPlatform[];
    outcome: "done" | "failed" | "retry";
  }> = [];
  const skipped: Array<{ node: string; id: string; reason: string }> = [];
  let claimed = 0;
  for (const entry of due) {
    if (Date.now() >= deadlineMs) {
      skipped.push({ node: entry.collection, id: entry.docId, reason: "TICK_BUDGET_EXHAUSTED" });
      continue;
    }
    const result = await runDueJob(entry.collection, entry.docId, nowMs, deadlineMs);
    if (result.claimed) {
      claimed += 1;
      items.push(result.item);
    } else {
      skipped.push({ node: entry.collection, id: entry.docId, reason: result.reason });
    }
  }

  return {
    ranAt: nowIso,
    selected: due.length,
    selectedByNode,
    claimed,
    skipped,
    items,
  };
}
