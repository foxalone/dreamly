import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublishLogEntry,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  isLegacyPlatformKey,
  notionFormat,
  publicPublishUrl,
  publishLogKey,
  titledWithPlatformIcons,
} from "./socialPublishLog";

test("builds a stable dreamly key per asset", () => {
  assert.equal(publishLogKey("video", "ai:abc"), "dreamly:video:ai:abc");
  assert.equal(publishLogKey("image", "img1"), "dreamly:image:img1");
  assert.equal(isLegacyPlatformKey("dreamly:video:ai:abc:tiktok"), true);
  assert.equal(isLegacyPlatformKey("dreamly:video:ai:abc"), false);
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

test("groups a video's published platforms onto one row", () => {
  const rows = entriesFromVideoDoc("ai:job1", {
    topic: "Snake dream",
    youtubeMetadata: { title: "Snake meaning" },
    tiktokPublishedAt: "2026-08-01T10:00:00.000Z",
    youtubeStatus: "scheduled",
    youtubeScheduledAt: "2026-09-01T12:00:00.000Z",
    youtubeVideoId: "yt1",
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].platforms, ["YouTube", "TikTok"]);
  assert.equal(rows[0].title, "Snake meaning");
  assert.equal(rows[0].status, "Опубликовано");
  assert.equal(rows[0].publishedAt, "2026-08-01T10:00:00.000Z");
  assert.equal(rows[0].url, "https://www.youtube.com/watch?v=yt1");
  assert.equal(rows[0].key, "dreamly:video:ai:job1");
});

test("groups published image platforms onto one row", () => {
  const rows = entriesFromImageDoc("img9", {
    subject: "Owl",
    instagramPublishedAt: "2026-08-02T10:00:00.000Z",
    pinterestPublishedAt: "2026-08-03T10:00:00.000Z",
    pinterestPinId: "pin1",
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].platforms, ["Instagram", "Pinterest"]);
  assert.equal(titledWithPlatformIcons(rows[0].title, rows[0].platforms), "📸📌 Owl");
});

test("prefixes the Notion title with every published platform emoji", () => {
  assert.equal(titledWithPlatformIcons("Snake meaning", ["TikTok"]), "🎵 Snake meaning");
  assert.equal(titledWithPlatformIcons("🎵 Snake meaning", ["YouTube", "TikTok"]), "▶️🎵 Snake meaning");
  assert.equal(titledWithPlatformIcons("▶️🎵 Old title", ["Instagram", "Pinterest"]), "📸📌 Old title");
});

test("buildPublishLogEntry fills Notion labels for one new platform", () => {
  const row = buildPublishLogEntry({
    kind: "video",
    assetId: "free:1",
    platform: "facebook",
    title: "Falling",
    publishedAt: "2026-08-26T00:00:00.000Z",
  });
  assert.deepEqual(row.platforms, ["Facebook"]);
  assert.deepEqual(row.formats, ["Reels"]);
  assert.equal(row.key, "dreamly:video:free:1");
});
