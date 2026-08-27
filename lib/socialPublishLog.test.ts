import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublishLogEntry,
  calendarCardTitle,
  entriesFromImageDoc,
  entriesFromVideoDoc,
  isStaleGroupedKey,
  notionFormat,
  publicPublishUrl,
  publishLogKey,
} from "./socialPublishLog";

test("builds a stable dreamly key per asset and platform", () => {
  assert.equal(publishLogKey("video", "ai:abc", "tiktok"), "dreamly:video:ai:abc:tiktok");
  assert.equal(publishLogKey("image", "img1", "pinterest"), "dreamly:image:img1:pinterest");
  assert.equal(isStaleGroupedKey("dreamly:video:ai:abc"), true);
  assert.equal(isStaleGroupedKey("dreamly:video:ai:abc:tiktok"), false);
});

test("maps calendar cards to a short channel code and project", () => {
  assert.equal(calendarCardTitle("Dreamly", "YouTube"), "Y Dreamly");
  assert.equal(calendarCardTitle("Dreamly", "TikTok"), "Ti Dreamly");
  assert.equal(calendarCardTitle("Dreamly", "Instagram"), "I Dreamly");
  assert.equal(calendarCardTitle("Dreamly", "Threads"), "Tr Dreamly");
  assert.equal(calendarCardTitle("Dreamly", "Facebook"), "Fb Dreamly");
  assert.equal(calendarCardTitle("Currency", "Pinterest"), "P Currency");
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

test("emits one calendar row per published platform", () => {
  const rows = entriesFromVideoDoc("ai:job1", {
    topic: "Snake dream",
    youtubeMetadata: { title: "Snake meaning" },
    tiktokPublishedAt: "2026-08-01T10:00:00.000Z",
    youtubeStatus: "scheduled",
    youtubeScheduledAt: "2026-09-01T12:00:00.000Z",
    youtubeVideoId: "yt1",
  });
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.platform === "TikTok")?.key, "dreamly:video:ai:job1:tiktok");
  assert.equal(calendarCardTitle("Dreamly", rows.find((row) => row.platform === "YouTube")!.platform), "Y Dreamly");
});

test("emits one image row per published platform", () => {
  const rows = entriesFromImageDoc("img9", {
    subject: "Owl",
    instagramPublishedAt: "2026-08-02T10:00:00.000Z",
    pinterestPublishedAt: "2026-08-03T10:00:00.000Z",
    pinterestPinId: "pin1",
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].platform, "Instagram");
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
  assert.equal(row.project, "Dreamly");
  assert.equal(row.key, "dreamly:video:free:1:facebook");
  assert.equal(calendarCardTitle(row.project, row.platform), "Fb Dreamly");
});
