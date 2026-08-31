export const SOCIAL_SCHEDULE_LOCK_MS = 20 * 60 * 1000;
export const SOCIAL_SCHEDULE_MAX_ATTEMPTS = 12;

export const SOCIAL_SCHEDULE_PLATFORMS = [
  "tiktok",
  "instagram",
  "facebook",
  "threads",
  "pinterest",
] as const;

export type SocialSchedulePlatform = (typeof SOCIAL_SCHEDULE_PLATFORMS)[number];
export type SocialScheduleOutcome = "done" | "failed" | "retry";

export type SocialScheduleRecord = {
  socialScheduledAt?: unknown;
  socialScheduledPlatforms?: unknown;
  socialScheduleStatus?: unknown;
  socialScheduleStartedAt?: unknown;
  socialScheduleAttempts?: unknown;
  socialSchedulePublished?: unknown;
  socialScheduleFailures?: unknown;
} & Record<string, unknown>;

export function isSocialSchedulePlatform(value: unknown): value is SocialSchedulePlatform {
  return (
    typeof value === "string" &&
    (SOCIAL_SCHEDULE_PLATFORMS as readonly string[]).includes(value)
  );
}

export function normalizeSchedulePlatforms(value: unknown): SocialSchedulePlatform[] {
  const source = Array.isArray(value) ? value : [];
  const selected = new Set(source.filter(isSocialSchedulePlatform));
  return SOCIAL_SCHEDULE_PLATFORMS.filter((platform) => selected.has(platform));
}

export function scheduleAttempts(record: SocialScheduleRecord) {
  const value = Number(record.socialScheduleAttempts || 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function schedulePublished(record: SocialScheduleRecord) {
  const progress = new Set(normalizeSchedulePlatforms(record.socialSchedulePublished));
  for (const platform of SOCIAL_SCHEDULE_PLATFORMS) {
    if (String(record[`${platform}PublishedAt`] || "")) progress.add(platform);
  }
  return SOCIAL_SCHEDULE_PLATFORMS.filter((platform) => progress.has(platform));
}

export function scheduleFailures(record: SocialScheduleRecord) {
  const failures: Partial<Record<SocialSchedulePlatform, string>> = {};
  if (!record.socialScheduleFailures || typeof record.socialScheduleFailures !== "object") return failures;
  for (const [platform, message] of Object.entries(
    record.socialScheduleFailures as Record<string, unknown>,
  )) {
    if (isSocialSchedulePlatform(platform) && String(message || "").trim()) {
      failures[platform] = String(message).trim();
    }
  }
  return failures;
}

export function claimableSchedule(record: SocialScheduleRecord, nowMs: number) {
  const scheduledAt = String(record.socialScheduledAt || "").trim();
  const dueAt = Date.parse(scheduledAt);
  if (!scheduledAt || !Number.isFinite(dueAt)) return { claimable: false as const, reason: "INVALID_DATE" };
  if (dueAt > nowMs) return { claimable: false as const, reason: "NOT_DUE" };

  const status = String(record.socialScheduleStatus || "");
  if (status === "running") {
    const startedAt = Date.parse(String(record.socialScheduleStartedAt || ""));
    if (Number.isFinite(startedAt) && nowMs - startedAt < SOCIAL_SCHEDULE_LOCK_MS) {
      return { claimable: false as const, reason: "LOCKED" };
    }
  } else if (status !== "pending") {
    return { claimable: false as const, reason: "NOT_PENDING" };
  }

  const published = schedulePublished(record);
  const publishedSet = new Set(published);
  const platforms = normalizeSchedulePlatforms(record.socialScheduledPlatforms).filter(
    (platform) => !publishedSet.has(platform),
  );
  if (!platforms.length) return { claimable: false as const, reason: "EMPTY", published };

  return {
    claimable: true as const,
    scheduledAt,
    platforms,
    published,
    failures: scheduleFailures(record),
    attempts: scheduleAttempts(record),
  };
}

export function finishScheduleState(input: {
  published: SocialSchedulePlatform[];
  failed: Partial<Record<SocialSchedulePlatform, string>>;
  pending: SocialSchedulePlatform[];
  attempts: number;
}) {
  const published = normalizeSchedulePlatforms(input.published);
  const pending = normalizeSchedulePlatforms(input.pending);
  const failed = Object.fromEntries(
    Object.entries(input.failed).filter(
      ([platform, message]) => isSocialSchedulePlatform(platform) && String(message || "").trim(),
    ),
  ) as Partial<Record<SocialSchedulePlatform, string>>;

  if (pending.length && input.attempts < SOCIAL_SCHEDULE_MAX_ATTEMPTS) {
    return {
      outcome: "retry" as const,
      clearScheduledAt: false,
      status: "pending" as const,
      platforms: pending,
      published,
      failed,
      attempts: input.attempts + 1,
    };
  }

  if (pending.length) {
    for (const platform of pending) failed[platform] = "SCHEDULE_ATTEMPTS_EXHAUSTED";
  }
  const hasFailures = Object.keys(failed).length > 0;
  return {
    outcome: (hasFailures ? "failed" : "done") as SocialScheduleOutcome,
    clearScheduledAt: true,
    status: (hasFailures ? "failed" : "done") as "failed" | "done",
    platforms: [] as SocialSchedulePlatform[],
    published,
    failed,
    attempts: input.attempts,
  };
}
