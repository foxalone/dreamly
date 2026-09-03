import assert from "node:assert/strict";
import test from "node:test";

import { buildSocialCoverageRows } from "./adminSocialCoverage";

test("social coverage separates Buffer from direct integrations and keeps the remaining candidates", () => {
  const rows = buildSocialCoverageRows({
    tiktok: {
      configured: true,
      connected: true,
      platform: "tiktok",
      channel: "dreamly_art",
      channelId: "",
      error: "",
    },
    meta: {
      configured: true,
      connected: true,
      facebookReady: true,
      instagramReady: true,
      pageId: "page-1",
      pageName: "Dreamly",
      igUserId: "ig-1",
      igUsername: "get.dreamly",
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
    },
    pinterest: {
      configured: true,
      connected: true,
      accountId: "pin-1",
      username: "getdreamly",
      boardId: "board-1",
      boardName: "Dream meanings",
      scope: "",
      accessTokenExpiresAt: null,
      connectedAt: null,
    },
  });

  assert.equal(rows.find((entry) => entry.id === "tiktok")?.connectionKind, "buffer");
  assert.equal(rows.find((entry) => entry.id === "instagram")?.connectionKind, "direct");
  assert.equal(rows.find((entry) => entry.id === "facebook")?.account, "Dreamly");
  assert.equal(rows.find((entry) => entry.id === "pinterest")?.state, "limited");
  assert.match(rows.find((entry) => entry.id === "pinterest")?.remaining || "", /Standard Access/);
  assert.equal(rows.find((entry) => entry.id === "vimeo")?.state, "skipped");
  assert.equal(rows.find((entry) => entry.id === "linkedin")?.state, "planned");
});

test("social coverage reports missing setup and Tumblr token health", () => {
  const rows = buildSocialCoverageRows({
    tiktok: {
      configured: false,
      connected: false,
      platform: "tiktok",
      channel: "",
      channelId: "",
      error: "BUFFER_API_KEY is not configured",
    },
    tumblr: {
      connected: true,
      configured: true,
      userName: "dreamly",
      blogIdentifier: "dreamly.tumblr.com",
      blogName: "dreamly",
      blogTitle: "Dreamly",
      blogUrl: "https://dreamly.tumblr.com/",
      blogs: [],
      blogAmbiguous: false,
      scope: "basic write offline_access",
      accessTokenExpiresAt: null,
      tokenHealthy: false,
      connectedAt: null,
    },
  });

  assert.equal(rows.find((entry) => entry.id === "tiktok")?.state, "missing");
  assert.equal(rows.find((entry) => entry.id === "tiktok")?.remaining, "Добавить BUFFER_API_KEY");
  assert.equal(rows.find((entry) => entry.id === "tumblr")?.state, "limited");
  assert.match(rows.find((entry) => entry.id === "tumblr")?.remaining || "", /refresh token/);
});

