export const SOCIAL_SCHEDULE_ASSETS_NODE = "social_scheduled_assets";
export const SOCIAL_SCHEDULE_FIELD = "socialSchedule";
export const SOCIAL_SCHEDULE_DUE_INDEX = `${SOCIAL_SCHEDULE_FIELD}/scheduledAt`;
export const SOCIAL_SCHEDULE_MIN_SORT_KEY = "1";
export const SOCIAL_SCHEDULE_LOCK_MS = 20 * 60 * 1000;
export const SOCIAL_SCHEDULE_MAX_ATTEMPTS = 12;
export const SOCIAL_SCHEDULE_BATCH_LIMIT = 4;

export const SOCIAL_SCHEDULE_PLATFORMS = [
  "tiktok",
  "instagram",
  "facebook",
  "threads",
  "pinterest",
] as const;

export type SocialSchedulePlatform = (typeof SOCIAL_SCHEDULE_PLATFORMS)[number];
export type SocialScheduleStatus = "pending" | "running" | "done" | "failed";
export type SocialScheduleOutcome = "done" | "failed" | "retry";

export type SocialScheduleContainer = {
  containerId: string;
};

export type SocialScheduleNode = {
  scheduledAt?: string;
  platforms: SocialSchedulePlatform[];
  status: SocialScheduleStatus;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  createdBy?: string;
  attempts?: number;
  published?: SocialSchedulePlatform[];
  error?: Partial<Record<SocialSchedulePlatform, string>>;
  containers?: Partial<Record<SocialSchedulePlatform, SocialScheduleContainer>>;
};

export type SocialScheduledAsset = {
  libraryId: string;
  title: string;
  socialSchedule: SocialScheduleNode;
};

export function isSocialSchedulePlatform(value: unknown): value is SocialSchedulePlatform {
  return (
    typeof value === "string" &&
    (SOCIAL_SCHEDULE_PLATFORMS as readonly string[]).includes(value)
  );
}

export function isProcessingPublishStatus(value: unknown) {
  return ["PROCESSING", "IN_PROGRESS", "PUBLISHING"].includes(String(value || "").toUpperCase());
}

export function normalizeSchedulePlatforms(value: unknown): SocialSchedulePlatform[] {
  const source = Array.isArray(value) ? value : [];
  const selected = new Set(source.filter(isSocialSchedulePlatform));
  return SOCIAL_SCHEDULE_PLATFORMS.filter((platform) => selected.has(platform));
}

function normalizedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readScheduleNode(value: unknown): SocialScheduleNode | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const scheduledAt = normalizedText(source.scheduledAt);
  const platforms = normalizeSchedulePlatforms(source.platforms);
  const published = normalizeSchedulePlatforms(source.published);
  const status: SocialScheduleStatus =
    source.status === "running" || source.status === "done" || source.status === "failed"
      ? source.status
      : "pending";

  if (!scheduledAt && !platforms.length && !published.length && status === "pending") return null;

  const error: Partial<Record<SocialSchedulePlatform, string>> = {};
  if (source.error && typeof source.error === "object") {
    for (const [platform, message] of Object.entries(source.error as Record<string, unknown>)) {
      if (isSocialSchedulePlatform(platform) && normalizedText(message)) {
        error[platform] = normalizedText(message);
      }
    }
  }

  const containers: Partial<Record<SocialSchedulePlatform, SocialScheduleContainer>> = {};
  if (source.containers && typeof source.containers === "object") {
    for (const [platform, raw] of Object.entries(source.containers as Record<string, unknown>)) {
      if (!isSocialSchedulePlatform(platform) || !raw || typeof raw !== "object") continue;
      const containerId = normalizedText((raw as Record<string, unknown>).containerId);
      if (containerId) containers[platform] = { containerId };
    }
  }

  const attempts = Number(source.attempts || 0);
  return {
    ...(scheduledAt ? { scheduledAt } : {}),
    platforms,
    status,
    ...(normalizedText(source.startedAt) ? { startedAt: normalizedText(source.startedAt) } : {}),
    ...(normalizedText(source.finishedAt) ? { finishedAt: normalizedText(source.finishedAt) } : {}),
    ...(normalizedText(source.createdAt) ? { createdAt: normalizedText(source.createdAt) } : {}),
    ...(normalizedText(source.createdBy) ? { createdBy: normalizedText(source.createdBy) } : {}),
    ...(Number.isFinite(attempts) && attempts > 0 ? { attempts: Math.floor(attempts) } : {}),
    ...(published.length ? { published } : {}),
    ...(Object.keys(error).length ? { error } : {}),
    ...(Object.keys(containers).length ? { containers } : {}),
  };
}

export function isScheduleClaimable(
  schedule: SocialScheduleNode | null,
  nowMs: number,
): schedule is SocialScheduleNode {
  if (!schedule?.scheduledAt || !schedule.platforms.length) return false;
  const dueAt = Date.parse(schedule.scheduledAt);
  if (!Number.isFinite(dueAt) || dueAt > nowMs) return false;

  if (schedule.status === "running") {
    const startedAt = Date.parse(schedule.startedAt || "");
    return !Number.isFinite(startedAt) || nowMs - startedAt > SOCIAL_SCHEDULE_LOCK_MS;
  }
  return schedule.status === "pending";
}

/**
 * The exact callback used by RTDB transaction(). A cold Admin SDK process can
 * invoke it with null before receiving the authoritative server value. Returning
 * undefined in that first pass aborts forever; returning null allows the server
 * compare-and-retry pass to call it again with the real schedule.
 */
export function buildClaimTransactionUpdate(nowMs: number) {
  const startedAt = new Date(nowMs).toISOString();
  return (current: unknown) => {
    if (current === null) return null;
    if (!isScheduleClaimable(readScheduleNode(current), nowMs)) return undefined;
    return {
      ...(current as Record<string, unknown>),
      status: "running",
      startedAt,
    };
  };
}

export function buildFinishUpdate(
  input: {
    published: SocialSchedulePlatform[];
    failed: Partial<Record<SocialSchedulePlatform, string>>;
    pending: SocialSchedulePlatform[];
    containers?: Partial<Record<SocialSchedulePlatform, SocialScheduleContainer>>;
    attempts: number;
  },
  nowIso: string,
) {
  const published = normalizeSchedulePlatforms(input.published);
  const pending = normalizeSchedulePlatforms(input.pending);
  const failed = Object.fromEntries(
    Object.entries(input.failed).filter(
      ([platform, message]) => isSocialSchedulePlatform(platform) && normalizedText(message),
    ),
  ) as Partial<Record<SocialSchedulePlatform, string>>;
  const containers = input.containers || {};

  if (pending.length && input.attempts < SOCIAL_SCHEDULE_MAX_ATTEMPTS) {
    return {
      outcome: "retry" as const,
      update: {
        status: "pending",
        startedAt: null,
        platforms: pending,
        published: published.length ? published : null,
        error: Object.keys(failed).length ? failed : null,
        containers: Object.keys(containers).length ? containers : null,
        attempts: input.attempts + 1,
      },
    };
  }

  for (const platform of pending) failed[platform] = "SCHEDULE_ATTEMPTS_EXHAUSTED";
  const hasFailures = Object.keys(failed).length > 0;
  return {
    outcome: (hasFailures ? "failed" : "done") as SocialScheduleOutcome,
    update: {
      scheduledAt: null,
      startedAt: null,
      platforms: null,
      containers: null,
      status: hasFailures ? "failed" : "done",
      finishedAt: nowIso,
      attempts: input.attempts,
      published: published.length ? published : null,
      error: hasFailures ? failed : null,
    },
  };
}

export function queueIdForLibraryId(libraryId: string) {
  return libraryId.replace(":", "__");
}
