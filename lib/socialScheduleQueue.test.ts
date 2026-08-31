import assert from "node:assert/strict";
import test from "node:test";

import {
  SOCIAL_SCHEDULE_LOCK_MS,
  SOCIAL_SCHEDULE_MAX_ATTEMPTS,
  claimableSchedule,
  finishScheduleState,
  isProcessingPublishStatus,
  normalizeSchedulePlatforms,
  schedulePublished,
} from "./socialScheduleQueue";

const now = Date.parse("2026-08-31T10:00:00.000Z");
const due = {
  socialScheduledAt: "2026-08-31T09:55:00.000Z",
  socialScheduledPlatforms: ["tiktok", "instagram", "facebook"],
  socialScheduleStatus: "pending",
};

test("claim принимает только наступившее pending-задание", () => {
  assert.equal(claimableSchedule(due, now).claimable, true);
  assert.deepEqual(
    claimableSchedule({ ...due, socialScheduledAt: "2026-08-31T10:05:00.000Z" }, now),
    { claimable: false, reason: "NOT_DUE" },
  );
  assert.deepEqual(
    claimableSchedule({ ...due, socialScheduleStatus: "done" }, now),
    { claimable: false, reason: "NOT_PENDING" },
  );
});

test("свежий running не забирается, stale running можно продолжить", () => {
  const fresh = claimableSchedule(
    { ...due, socialScheduleStatus: "running", socialScheduleStartedAt: new Date(now - 60_000).toISOString() },
    now,
  );
  const stale = claimableSchedule(
    {
      ...due,
      socialScheduleStatus: "running",
      socialScheduleStartedAt: new Date(now - SOCIAL_SCHEDULE_LOCK_MS - 1).toISOString(),
    },
    now,
  );
  assert.deepEqual(fresh, { claimable: false, reason: "LOCKED" });
  assert.equal(stale.claimable, true);
});

test("успешные площадки исключаются из повторного claim", () => {
  const claim = claimableSchedule(
    {
      ...due,
      socialSchedulePublished: ["tiktok"],
      instagramPublishedAt: "2026-08-31T09:58:00.000Z",
    },
    now,
  );
  assert.equal(claim.claimable, true);
  if (!claim.claimable) throw new Error("expected claim");
  assert.deepEqual(claim.platforms, ["facebook"]);
  assert.deepEqual(claim.published, ["tiktok", "instagram"]);
});

test("нормализация удаляет дубли и неизвестные площадки", () => {
  assert.deepEqual(normalizeSchedulePlatforms(["facebook", "myspace", "tiktok", "facebook"]), [
    "tiktok",
    "facebook",
  ]);
  assert.deepEqual(schedulePublished({ tiktokPublishedAt: "now", socialSchedulePublished: ["threads"] }), [
    "tiktok",
    "threads",
  ]);
});

test("остаток по бюджету возвращается в pending без удаления scheduledAt", () => {
  const finish = finishScheduleState({
    published: ["tiktok"],
    failed: {},
    pending: ["instagram", "facebook"],
    attempts: 2,
  });
  assert.equal(finish.outcome, "retry");
  assert.equal(finish.clearScheduledAt, false);
  assert.equal(finish.status, "pending");
  assert.equal(finish.attempts, 3);
  assert.deepEqual(finish.platforms, ["instagram", "facebook"]);
});

test("успех и окончательная ошибка удаляют due-поле", () => {
  const done = finishScheduleState({ published: ["tiktok"], failed: {}, pending: [], attempts: 0 });
  const failed = finishScheduleState({
    published: ["tiktok"],
    failed: { facebook: "API_ERROR" },
    pending: [],
    attempts: 0,
  });
  assert.equal(done.outcome, "done");
  assert.equal(done.clearScheduledAt, true);
  assert.equal(failed.outcome, "failed");
  assert.equal(failed.clearScheduledAt, true);
  assert.deepEqual(failed.failed, { facebook: "API_ERROR" });
});

test("бесконечный processing завершается контролируемой ошибкой", () => {
  const finish = finishScheduleState({
    published: [],
    failed: {},
    pending: ["instagram"],
    attempts: SOCIAL_SCHEDULE_MAX_ATTEMPTS,
  });
  assert.equal(finish.outcome, "failed");
  assert.equal(finish.clearScheduledAt, true);
  assert.deepEqual(finish.failed, { instagram: "SCHEDULE_ATTEMPTS_EXHAUSTED" });
});

test("асинхронный ответ провайдера остаётся pending, а не published", () => {
  assert.equal(isProcessingPublishStatus("PROCESSING"), true);
  assert.equal(isProcessingPublishStatus("in_progress"), true);
  assert.equal(isProcessingPublishStatus("PUBLISHED"), false);
});
