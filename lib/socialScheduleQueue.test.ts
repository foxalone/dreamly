import assert from "node:assert/strict";
import test from "node:test";

import {
  SOCIAL_SCHEDULE_LOCK_MS,
  SOCIAL_SCHEDULE_MAX_ATTEMPTS,
  buildClaimTransactionUpdate,
  buildFinishUpdate,
  isScheduleClaimable,
  isProcessingPublishStatus,
  notificationPublishedPlatforms,
  normalizeSchedulePlatforms,
  readScheduleNode,
} from "./socialScheduleQueue";

const now = Date.parse("2026-08-31T10:00:00.000Z");
const due = {
  scheduledAt: "2026-08-31T09:55:00.000Z",
  platforms: ["tiktok", "instagram", "facebook"],
  status: "pending",
};

test("claim принимает только наступившее pending-задание", () => {
  assert.equal(isScheduleClaimable(readScheduleNode(due), now), true);
  assert.equal(
    isScheduleClaimable(
      readScheduleNode({ ...due, scheduledAt: "2026-08-31T10:05:00.000Z" }),
      now,
    ),
    false,
  );
  assert.equal(isScheduleClaimable(readScheduleNode({ ...due, status: "done" }), now), false);
});

test("свежий running не забирается, stale running можно продолжить", () => {
  const fresh = readScheduleNode({
    ...due,
    status: "running",
    startedAt: new Date(now - 60_000).toISOString(),
  });
  const stale = readScheduleNode({
    ...due,
    status: "running",
    startedAt: new Date(now - SOCIAL_SCHEDULE_LOCK_MS - 1).toISOString(),
  });
  assert.equal(isScheduleClaimable(fresh, now), false);
  assert.equal(isScheduleClaimable(stale, now), true);
});

test("холодный null не отменяет transaction до чтения серверного значения", () => {
  const update = buildClaimTransactionUpdate(now);
  assert.equal(update(null), null);
  const claimed = update(due) as Record<string, unknown>;
  assert.equal(claimed.status, "running");
  assert.equal(claimed.startedAt, "2026-08-31T10:00:00.000Z");
});

test("нормализация удаляет дубли и неизвестные площадки", () => {
  assert.deepEqual(normalizeSchedulePlatforms(["facebook", "pinterest", "bluesky", "myspace", "tiktok", "facebook"]), [
    "tiktok",
    "facebook",
    "bluesky",
  ]);
});

test("Telegram-отчёт добавляет отдельно запланированный YouTube", () => {
  assert.deepEqual(
    notificationPublishedPlatforms(
      ["tiktok", "instagram", "facebook", "threads"],
      {
        youtubeStatus: "scheduled",
        youtubeScheduledAt: "2026-08-31T09:55:00.000Z",
      },
      "2026-08-31T09:55:00.000Z",
    ),
    ["tiktok", "instagram", "facebook", "threads", "youtube"],
  );
});

test("Telegram-отчёт не добавляет YouTube из другого расписания", () => {
  assert.deepEqual(
    notificationPublishedPlatforms(
      ["tiktok"],
      {
        youtubeStatus: "scheduled",
        youtubeScheduledAt: "2026-08-31T10:55:00.000Z",
      },
      "2026-08-31T09:55:00.000Z",
    ),
    ["tiktok"],
  );
});

test("остаток по бюджету возвращается в pending без удаления scheduledAt", () => {
  const finish = buildFinishUpdate(
    { published: ["tiktok"], failed: {}, pending: ["instagram", "facebook"], attempts: 2 },
    "2026-08-31T10:00:01.000Z",
  );
  assert.equal(finish.outcome, "retry");
  assert.equal("scheduledAt" in finish.update, false);
  assert.equal(finish.update.status, "pending");
  assert.equal(finish.update.attempts, 3);
  assert.deepEqual(finish.update.platforms, ["instagram", "facebook"]);
});

test("успех и окончательная ошибка удаляют due-поле", () => {
  const done = buildFinishUpdate(
    { published: ["tiktok"], failed: {}, pending: [], attempts: 0 },
    "2026-08-31T10:00:01.000Z",
  );
  const failed = buildFinishUpdate(
    { published: ["tiktok"], failed: { facebook: "API_ERROR" }, pending: [], attempts: 0 },
    "2026-08-31T10:00:01.000Z",
  );
  assert.equal(done.outcome, "done");
  assert.equal(done.update.scheduledAt, null);
  assert.equal(failed.outcome, "failed");
  assert.equal(failed.update.scheduledAt, null);
  assert.deepEqual(failed.update.error, { facebook: "API_ERROR" });
});

test("бесконечный processing завершается контролируемой ошибкой", () => {
  const finish = buildFinishUpdate(
    {
      published: [],
      failed: {},
      pending: ["instagram"],
      attempts: SOCIAL_SCHEDULE_MAX_ATTEMPTS,
    },
    "2026-08-31T10:00:01.000Z",
  );
  assert.equal(finish.outcome, "failed");
  assert.equal(finish.update.scheduledAt, null);
  assert.deepEqual(finish.update.error, { instagram: "SCHEDULE_ATTEMPTS_EXHAUSTED" });
});

test("асинхронный ответ провайдера остаётся pending, а не published", () => {
  assert.equal(isProcessingPublishStatus("PROCESSING"), true);
  assert.equal(isProcessingPublishStatus("in_progress"), true);
  assert.equal(isProcessingPublishStatus("PUBLISHED"), false);
});
