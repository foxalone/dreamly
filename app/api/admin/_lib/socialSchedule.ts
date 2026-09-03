import { FieldValue } from "firebase-admin/firestore";

import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  QUEUED_SCHEDULE_PLATFORMS,
  type AdminVideoPlatform,
  type AdminVideoScheduleStatus,
} from "@/lib/adminVideoLibrary";
import { isSocialPublishPendingError } from "@/lib/socialPublishPending";
import { buildPublishLogEntry } from "@/lib/socialPublishLog";
import {
  SOCIAL_SCHEDULE_ASSETS_NODE,
  SOCIAL_SCHEDULE_BATCH_LIMIT,
  SOCIAL_SCHEDULE_DUE_INDEX,
  SOCIAL_SCHEDULE_FIELD,
  SOCIAL_SCHEDULE_MIN_SORT_KEY,
  buildClaimTransactionUpdate,
  buildFinishUpdate,
  isScheduleClaimable,
  notificationPublishedPlatforms,
  normalizeSchedulePlatforms,
  queueIdForLibraryId,
  readScheduleNode,
  type SocialScheduleContainer,
  type SocialScheduleNode,
  type SocialSchedulePlatform,
} from "@/lib/socialScheduleQueue";
import { adminDb, adminRtdb } from "@/app/api/admin/_lib/firebaseAdmin";
import { trackSocialPublishes } from "@/app/api/admin/_lib/notionPublishLog";
import { notifyTelegram } from "@/app/api/admin/_lib/telegram";
import { publishLibraryVideoToMeta } from "@/app/api/admin/meta/_lib";
import { publishLibraryVideoToBluesky } from "@/app/api/admin/bluesky/_lib";
import { publishLibraryVideoToThreads } from "@/app/api/admin/threads/_lib";
import { publishLibraryVideoToTikTok } from "@/app/api/admin/tiktok/_lib";
import { publishLibraryVideoToTumblr } from "@/app/api/admin/tumblr/_lib";
import { normalizePublishAt, publishLibraryVideoToYouTube } from "@/app/api/admin/youtube/_lib";

const SCHEDULE_BUDGET_MS = 240 * 1000;
const META_PLATFORM_BUDGET_MS = 35 * 1000;

export type ScheduleJobData = {
  socialScheduledAt?: string;
  socialScheduledPlatforms?: string[];
  socialScheduleStatus?: string;
  socialScheduleStartedAt?: string;
  socialScheduleError?: string;
  socialScheduleAttempts?: number;
  socialSchedulePublished?: string[];
  socialScheduleFailures?: Record<string, string>;
  youtubePublishedAt?: string;
  youtubeScheduledAt?: string;
  youtubeStatus?: string;
  youtubeMetadata?: { title?: string };
  topic?: string;
} & Record<string, unknown>;

type DueSchedule = {
  id: string;
  libraryId: string;
  title: string;
  schedule: SocialScheduleNode;
};

type RunItem = {
  node: string;
  id: string;
  title: string;
  scheduledAt: string;
  published: SocialSchedulePlatform[];
  failed: Array<{ platform: SocialSchedulePlatform; error: string }>;
  pending: SocialSchedulePlatform[];
  outcome: "done" | "failed" | "retry";
};

function parseLibraryId(libraryId: string) {
  const [rawKind, rawId] = libraryId.split(":");
  if (!rawId || (rawKind !== "free" && rawKind !== "ai")) throw new Error("Invalid video id");
  return { rawId, collection: rawKind === "free" ? "adminVideoJobs" : AI_VIDEO_COLLECTION };
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

function alreadyPublished(data: ScheduleJobData, platform: SocialSchedulePlatform) {
  return Boolean(String(data[`${platform}PublishedAt`] || ""));
}

async function publishOne(
  libraryId: string,
  platform: SocialSchedulePlatform,
  deadlineMs: number,
) {
  if (platform === "tiktok") return publishLibraryVideoToTikTok(libraryId, "scheduler");
  if (platform === "instagram" || platform === "facebook") {
    return publishLibraryVideoToMeta(libraryId, "scheduler", platform, {
      deadlineMs: Math.min(deadlineMs, Date.now() + META_PLATFORM_BUDGET_MS),
    });
  }
  if (platform === "threads") {
    return publishLibraryVideoToThreads(libraryId, "scheduler", {
      deadlineMs: Math.min(deadlineMs, Date.now() + META_PLATFORM_BUDGET_MS),
    });
  }
  if (platform === "bluesky") {
    return publishLibraryVideoToBluesky(libraryId, "scheduler", { deadlineMs });
  }
  if (platform === "tumblr") {
    return publishLibraryVideoToTumblr(libraryId, "scheduler", { deadlineMs });
  }
  throw new Error(`Platform ${platform} is not queued`);
}

function assetRef(queueId: string) {
  return adminRtdb().ref(`${SOCIAL_SCHEDULE_ASSETS_NODE}/${queueId}`);
}

function scheduleRef(queueId: string) {
  return assetRef(queueId).child(SOCIAL_SCHEDULE_FIELD);
}

async function writeQueue(input: {
  libraryId: string;
  title: string;
  scheduledAt: string;
  platforms: SocialSchedulePlatform[];
  createdBy: string;
}) {
  const queueId = queueIdForLibraryId(input.libraryId);
  await assetRef(queueId).set({
    libraryId: input.libraryId,
    title: input.title,
    socialSchedule: {
      scheduledAt: input.scheduledAt,
      platforms: input.platforms,
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      attempts: 0,
    },
  });
  return queueId;
}

async function cancelQueue(queueId: string) {
  let found = false;
  const result = await scheduleRef(queueId).transaction((current) => {
    if (current === null) return null;
    const schedule = readScheduleNode(current);
    if (!schedule || schedule.status === "running") return undefined;
    found = true;
    return null;
  });
  if (!result.committed || !found) return false;
  await assetRef(queueId).remove();
  return true;
}

async function listDue(nowIso: string, limit: number): Promise<DueSchedule[]> {
  const snapshot = await adminRtdb()
    .ref(SOCIAL_SCHEDULE_ASSETS_NODE)
    .orderByChild(SOCIAL_SCHEDULE_DUE_INDEX)
    .startAt(SOCIAL_SCHEDULE_MIN_SORT_KEY)
    .endAt(nowIso)
    .limitToFirst(Math.max(1, limit))
    .get();
  if (!snapshot.exists()) return [];

  const due: DueSchedule[] = [];
  const nowMs = Date.parse(nowIso);
  snapshot.forEach((child) => {
    const record = (child.val() as Record<string, unknown>) || {};
    const schedule = readScheduleNode(record[SOCIAL_SCHEDULE_FIELD]);
    const libraryId = String(record.libraryId || "").trim();
    if (child.key && libraryId && isScheduleClaimable(schedule, nowMs)) {
      due.push({
        id: child.key,
        libraryId,
        title: String(record.title || libraryId).trim(),
        schedule,
      });
    }
    return false;
  });
  return due;
}

async function claim(queueId: string, nowMs: number) {
  const result = await scheduleRef(queueId).transaction(buildClaimTransactionUpdate(nowMs));
  return result.committed ? readScheduleNode(result.snapshot.val()) : null;
}

async function advance(
  queueId: string,
  input: {
    platforms: SocialSchedulePlatform[];
    published: SocialSchedulePlatform[];
    failed: Partial<Record<SocialSchedulePlatform, string>>;
    containers: Partial<Record<SocialSchedulePlatform, SocialScheduleContainer>>;
  },
) {
  await scheduleRef(queueId).update({
    platforms: input.platforms.length ? input.platforms : null,
    published: input.published.length ? input.published : null,
    error: Object.keys(input.failed).length ? input.failed : null,
    containers: Object.keys(input.containers).length ? input.containers : null,
  });
}

function errorText(failed: Partial<Record<SocialSchedulePlatform, string>>) {
  return Object.entries(failed)
    .map(([platform, message]) => `${platform}: ${message}`)
    .join("; ")
    .slice(0, 500);
}

async function mirrorProgress(
  libraryId: string,
  input: {
    platforms: SocialSchedulePlatform[];
    published: SocialSchedulePlatform[];
    failed: Partial<Record<SocialSchedulePlatform, string>>;
  },
) {
  const { rawId, collection } = parseLibraryId(libraryId);
  await adminDb().collection(collection).doc(rawId).set(
    {
      socialScheduledPlatforms: input.platforms,
      socialSchedulePublished: input.published,
      socialScheduleFailures: input.failed,
      socialScheduleError: errorText(input.failed),
    },
    { merge: true },
  );
}

async function readContainer(libraryId: string, platform: SocialSchedulePlatform) {
  if (platform !== "instagram" && platform !== "threads") return null;
  const { rawId, collection } = parseLibraryId(libraryId);
  const data = (await adminDb().collection(collection).doc(rawId).get()).data() as ScheduleJobData | undefined;
  const field = platform === "instagram" ? "instagramContainerId" : "threadsMediaId";
  const containerId = String(data?.[field] || "").trim();
  return containerId ? { containerId } : null;
}

async function mirrorFinish(libraryId: string, finish: ReturnType<typeof buildFinishUpdate>) {
  const { rawId, collection } = parseLibraryId(libraryId);
  const update = finish.update;
  const terminal = finish.outcome !== "retry";
  const failed = (update.error || {}) as Partial<Record<SocialSchedulePlatform, string>>;
  await adminDb().collection(collection).doc(rawId).set(
    {
      ...(terminal ? { socialScheduledAt: FieldValue.delete() } : {}),
      socialScheduledPlatforms: (update.platforms || []) as SocialSchedulePlatform[],
      socialScheduleStatus: update.status,
      socialScheduleStartedAt: "",
      ...(terminal ? { socialScheduleFinishedAt: update.finishedAt } : {}),
      socialScheduleAttempts: Number(update.attempts || 0),
      socialSchedulePublished: (update.published || []) as SocialSchedulePlatform[],
      socialScheduleFailures: failed,
      socialScheduleError: errorText(failed),
    },
    { merge: true },
  );
}

async function trackScheduled(
  libraryId: string,
  platforms: AdminVideoPlatform[],
  title: string,
  publishAt: string,
  status: "Запланировано" | "Отменено",
) {
  if (!platforms.length) return;
  const note = status === "Запланировано" ? "scheduled" : "schedule cancelled";
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
  ).catch((error) => console.error("[social-schedule] positioner", libraryId, error));
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
  const queued = normalizeSchedulePlatforms(
    platforms.filter(
      (platform) =>
        QUEUED_SCHEDULE_PLATFORMS.includes(platform) &&
        !alreadyPublished(data, platform as SocialSchedulePlatform),
    ),
  );
  const failed: { platform: AdminVideoPlatform; error: string }[] = [];
  let youtubeScheduled = false;

  if (platforms.includes("youtube")) {
    try {
      await publishLibraryVideoToYouTube(libraryId, adminUid, publishAt);
      youtubeScheduled = true;
    } catch (error) {
      failed.push({ platform: "youtube", error: error instanceof Error ? error.message : "YouTube error" });
    }
  }

  if (queued.length) {
    const queueId = await writeQueue({
      libraryId,
      title: videoTitle(data),
      scheduledAt: publishAt,
      platforms: queued,
      createdBy: adminUid,
    });
    try {
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
    } catch (error) {
      await assetRef(queueId).remove().catch(() => undefined);
      throw error;
    }
    await trackScheduled(libraryId, queued as AdminVideoPlatform[], videoTitle(data), publishAt, "Запланировано");
  }

  if (!queued.length && !youtubeScheduled) {
    throw new Error(failed[0]?.error || "Нет площадок для планирования");
  }
  return { ok: true as const, scheduledAt: publishAt, queued, youtubeScheduled, failed };
}

export async function cancelLibraryVideoSchedule(libraryId: string) {
  const { rawId, collection } = parseLibraryId(libraryId);
  const ref = adminDb().collection(collection).doc(rawId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Video not found");
  const data = snapshot.data() as ScheduleJobData;
  const queueId = queueIdForLibraryId(libraryId);
  const schedule = readScheduleNode((await scheduleRef(queueId).get()).val());
  if (!schedule?.scheduledAt || schedule.status === "running" || !(await cancelQueue(queueId))) {
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
  await trackScheduled(
    libraryId,
    schedule.platforms as AdminVideoPlatform[],
    videoTitle(data),
    schedule.scheduledAt,
    "Отменено",
  );
  return { ok: true as const, cancelled: schedule.platforms };
}

async function runDueJob(item: DueSchedule, deadlineMs: number) {
  const claimed = await claim(item.id, Date.now());
  if (!claimed?.scheduledAt) return { claimed: false as const, reason: "CLAIM_REJECTED" };

  const { rawId, collection } = parseLibraryId(item.libraryId);
  const ref = adminDb().collection(collection).doc(rawId);
  const published = [...(claimed.published || [])];
  const failed = { ...(claimed.error || {}) };
  const pending: SocialSchedulePlatform[] = [];
  const containers = { ...(claimed.containers || {}) };
  const untouched = [...claimed.platforms];

  for (const platform of claimed.platforms) {
    untouched.shift();
    if (Date.now() >= deadlineMs) {
      pending.push(platform, ...untouched);
      break;
    }
    try {
      const current = (await ref.get()).data() as ScheduleJobData | undefined;
      if (!current || !alreadyPublished(current, platform)) await publishOne(item.libraryId, platform, deadlineMs);
      if (!published.includes(platform)) published.push(platform);
      delete failed[platform];
      delete containers[platform];
    } catch (error) {
      if (isSocialPublishPendingError(error)) {
        pending.push(platform);
        const container = await readContainer(item.libraryId, platform);
        if (container) containers[platform] = container;
      } else {
        failed[platform] = error instanceof Error ? error.message : String(error || "Ошибка публикации");
      }
    }
    const remaining = normalizeSchedulePlatforms([...pending, ...untouched]);
    await advance(item.id, { platforms: remaining, published, failed, containers });
    await mirrorProgress(item.libraryId, { platforms: remaining, published, failed });
  }

  const finish = buildFinishUpdate(
    { published, failed, pending, containers, attempts: claimed.attempts || 0 },
    new Date().toISOString(),
  );
  await mirrorFinish(item.libraryId, finish);
  await scheduleRef(item.id).update(finish.update);
  if (finish.outcome === "done") await assetRef(item.id).remove();

  const finalFailed = (finish.update.error || {}) as Partial<Record<SocialSchedulePlatform, string>>;
  const failedList = Object.entries(finalFailed).map(([platform, error]) => ({
    platform: platform as SocialSchedulePlatform,
    error: String(error),
  }));
  const finalPending = normalizeSchedulePlatforms(finish.update.platforms || []);
  if (finish.outcome === "failed") {
    const current = ((await ref.get()).data() || {}) as ScheduleJobData;
    const notificationPublished = notificationPublishedPlatforms(published, current, claimed.scheduledAt);
    await notifyTelegram(
      [
        "❌ Отложенная публикация не удалась",
        item.title,
        notificationPublished.length
          ? `Вышло: ${notificationPublished.join(", ")}`
          : "Не вышло ни на одной площадке",
        ...failedList.map((entry) => `• ${entry.platform}: ${entry.error}`),
        `Повторить можно с карточки в админке: ${item.libraryId}`,
      ].join("\n"),
    );
  }

  return {
    claimed: true as const,
    item: {
      node: SOCIAL_SCHEDULE_ASSETS_NODE,
      id: item.id,
      title: item.title,
      scheduledAt: claimed.scheduledAt,
      published,
      failed: failedList,
      pending: finalPending,
      outcome: finish.outcome,
    } satisfies RunItem,
  };
}

export async function runDueSocialPublishes(limit = SOCIAL_SCHEDULE_BATCH_LIMIT) {
  const nowIso = new Date().toISOString();
  const deadlineMs = Date.now() + SCHEDULE_BUDGET_MS;
  const due = await listDue(nowIso, Math.max(1, limit));
  const summary = {
    ranAt: nowIso,
    selected: due.length,
    selectedByNode: { [SOCIAL_SCHEDULE_ASSETS_NODE]: due.length },
    claimed: 0,
    skipped: [] as Array<{ node: string; id: string; reason: string }>,
    items: [] as RunItem[],
  };

  for (const item of due) {
    if (Date.now() >= deadlineMs) {
      summary.skipped.push({ node: SOCIAL_SCHEDULE_ASSETS_NODE, id: item.id, reason: "TICK_BUDGET_EXHAUSTED" });
      continue;
    }
    const result = await runDueJob(item, deadlineMs);
    if (result.claimed) {
      summary.claimed += 1;
      summary.items.push(result.item);
    } else {
      summary.skipped.push({ node: SOCIAL_SCHEDULE_ASSETS_NODE, id: item.id, reason: result.reason });
    }
  }
  return summary;
}
