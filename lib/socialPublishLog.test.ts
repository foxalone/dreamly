import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublishLogEntry,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  notionFormat,
  publicPublishUrl,
  publishLogKey,
} from "./socialPublishLog";

test("builds a stable dreamly key per asset and platform", () => {
  assert.equal(publishLogKey("video", "ai:abc", "tiktok"), "dreamly:video:ai:abc:tiktok");
  assert.equal(publishLogKey("image", "img1", "pinterest"), "dreamly:image:img1:pinterest");
});

test("maps formats by asset and platform", () => {
  assert.equal(notionFormat("video", "youtube"), "Shorts");
  assert.equal(notionFormat("video", "instagram"), "Reels");
  assert.equal(notionFormat("image", "instagram"), "Post");
  assert.equal(notionFormat("video", "pinterest"), "Pin");
  assert.equal(notionFormat("video", "tiktok"), "Video");
});

test("builds public urls only when the id is known", () => {
  assert.equal(publicPublishUrl("youtube", { youtubeVideoId: "abc" }), "https://www.youtube.com/watch?v=abc");
  assert.equal(publicPublishUrl("pinterest", { pinterestPinId: "99" }), "https://www.pinterest.com/pin/99/");
  assert.equal(
    publicPublishUrl("facebook", { facebookPostId: "111_222" }),
    "https://www.facebook.com/111/posts/222",
  );
  assert.equal(publicPublishUrl("tiktok", {}), "");
});

test("collects published video platforms and scheduled YouTube", () => {
  const rows = entriesFromVideoDoc("ai:job1", {
    topic: "Snake dream",
    youtubeMetadata: { title: "Snake meaning" },
    tiktokPublishedAt: "2026-08-01T10:00:00.000Z",
    youtubeStatus: "scheduled",
    youtubeScheduledAt: "2026-09-01T12:00:00.000Z",
    youtubeVideoId: "yt1",
  });
  assert.equal(rows.length, 2);
  const tiktok = rows.find((row) => row.platform === "TikTok");
  const youtube = rows.find((row) => row.platform === "YouTube");
  assert.equal(tiktok?.status, "Опубликовано");
  assert.equal(tiktok?.title, "Snake meaning");
  assert.equal(youtube?.status, "Запланировано");
  assert.equal(youtube?.url, "https://www.youtube.com/watch?v=yt1");
});

test("collects published image platforms", () => {
  const rows = entriesFromImageDoc("img9", {
    subject: "Owl",
    instagramPublishedAt: "2026-08-02T10:00:00.000Z",
    pinterestPublishedAt: "2026-08-03T10:00:00.000Z",
    pinterestPinId: "pin1",
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[1].url, "https://www.pinterest.com/pin/pin1/");
});

test("buildPublishLogEntry fills Notion labels", () => {
  const row = buildPublishLogEntry({
    kind: "video",
    assetId: "free:1",
    platform: "facebook",
    title: "Falling",
    publishedAt: "2026-08-26T00:00:00.000Z",
  });
  assert.equal(row.platform, "Facebook");
  assert.equal(row.format, "Reels");
  assert.equal(row.key, "dreamly:video:free:1:facebook");
});
