import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const root = path.resolve(new URL("..", import.meta.url).pathname);

async function loadTypeScript(relativePath) {
  const filename = path.join(root, relativePath);
  const source = await fs.readFile(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: filename,
  }).outputText;
  return import(`data:text/javascript,${encodeURIComponent(transpiled)}`);
}

const model = await loadTypeScript("lib/socialScheduleQueue.ts");
const now = Date.parse("2026-08-31T10:00:00.000Z");
const due = {
  scheduledAt: "2026-08-31T09:55:00.000Z",
  platforms: ["tiktok", "instagram"],
  status: "pending",
};

test("due-query lower bound excludes null/empty values and includes ISO timestamps", () => {
  assert.ok("" < model.SOCIAL_SCHEDULE_MIN_SORT_KEY);
  assert.ok(model.SOCIAL_SCHEDULE_MIN_SORT_KEY < due.scheduledAt);
});

test("claim accepts due pending and stale running schedules only", () => {
  assert.equal(model.isScheduleClaimable(model.readScheduleNode(due), now), true);
  assert.equal(
    model.isScheduleClaimable(
      model.readScheduleNode({ ...due, scheduledAt: "2026-08-31T10:05:00.000Z" }),
      now,
    ),
    false,
  );
  assert.equal(
    model.isScheduleClaimable(
      model.readScheduleNode({
        ...due,
        status: "running",
        startedAt: new Date(now - model.SOCIAL_SCHEDULE_LOCK_MS - 1).toISOString(),
      }),
      now,
    ),
    true,
  );
});

test("cold-cache null does not abort the authoritative transaction retry", () => {
  const update = model.buildClaimTransactionUpdate(now);

  // First callback invocation in a cold process sees no local cache. A null
  // no-op allows RTDB to compare with the server and invoke the callback again.
  assert.equal(update(null), null);

  const claimed = update(due);
  assert.equal(claimed.status, "running");
  assert.equal(claimed.startedAt, "2026-08-31T10:00:00.000Z");
  assert.deepEqual(claimed.platforms, ["tiktok", "instagram"]);
});

test("fresh running schedule rejects a concurrent claim", () => {
  const update = model.buildClaimTransactionUpdate(now);
  assert.equal(
    update({ ...due, status: "running", startedAt: new Date(now - 60_000).toISOString() }),
    undefined,
  );
});

test("successful finish deletes scheduledAt with a real null", () => {
  const finish = model.buildFinishUpdate(
    { published: ["tiktok"], failed: {}, pending: [], attempts: 0 },
    "2026-08-31T10:00:01.000Z",
  );
  assert.equal(finish.outcome, "done");
  assert.equal(finish.update.scheduledAt, null);
  assert.equal(finish.update.status, "done");
});

test("Pinterest is ignored and YouTube is included in the Telegram summary", () => {
  assert.deepEqual(model.normalizeSchedulePlatforms(["tiktok", "pinterest"]), ["tiktok"]);
  assert.deepEqual(
    model.notificationPublishedPlatforms(
      ["tiktok"],
      {
        youtubeStatus: "scheduled",
        youtubeScheduledAt: "2026-08-31T09:55:00.000Z",
      },
      "2026-08-31T09:55:00.000Z",
    ),
    ["tiktok", "youtube"],
  );
});

test("processing container is retained for the next tick", () => {
  const finish = model.buildFinishUpdate(
    {
      published: ["tiktok"],
      failed: {},
      pending: ["instagram"],
      containers: { instagram: { containerId: "container-1" } },
      attempts: 1,
    },
    "2026-08-31T10:00:01.000Z",
  );
  assert.equal(finish.outcome, "retry");
  assert.equal("scheduledAt" in finish.update, false);
  assert.deepEqual(finish.update.platforms, ["instagram"]);
  assert.deepEqual(finish.update.containers, { instagram: { containerId: "container-1" } });
});

test("processing cannot retry forever", () => {
  const finish = model.buildFinishUpdate(
    {
      published: [],
      failed: {},
      pending: ["threads"],
      attempts: model.SOCIAL_SCHEDULE_MAX_ATTEMPTS,
    },
    "2026-08-31T10:00:01.000Z",
  );
  assert.equal(finish.outcome, "failed");
  assert.equal(finish.update.scheduledAt, null);
  assert.deepEqual(finish.update.error, { threads: "SCHEDULE_ATTEMPTS_EXHAUSTED" });
});

test("queue ids are valid RTDB keys and stable per library asset", () => {
  assert.equal(model.queueIdForLibraryId("ai:abc_123"), "ai__abc_123");
  assert.equal(model.queueIdForLibraryId("free:abc-123"), "free__abc-123");
});
