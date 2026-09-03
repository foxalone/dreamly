import assert from "node:assert/strict";
import test from "node:test";

import {
  TUMBLR_AUTHORIZE_URL,
  TUMBLR_MEDIA_FILENAME,
  TUMBLR_MEDIA_IDENTIFIER,
  TUMBLR_SCOPE_STRING,
  buildTumblrAuthorizeUrl,
  buildTumblrMultipartBody,
  buildTumblrNpfPost,
  buildTumblrTags,
  classifyTumblrError,
  isMp4,
  isTumblrAccessTokenStale,
  normalizeTumblrBlogIdentifier,
  normalizeTumblrBlogs,
  readMp4Dimensions,
  sanitizeTumblrError,
  selectTumblrBlog,
  tumblrPostUrl,
  tumblrTokenExpiryIso,
} from "./adminTumblr";
import { entriesFromVideoDoc, notionFormat, publicPublishUrl, publishLogKey } from "./socialPublishLog";
import { QUEUED_SCHEDULE_PLATFORMS } from "./adminVideoLibrary";
import { SOCIAL_SCHEDULE_PLATFORMS, normalizeSchedulePlatforms } from "./socialScheduleQueue";

function box(type: string, payload: Buffer) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(payload.length + 8, 0);
  header.write(type, 4, "ascii");
  return Buffer.concat([header, payload]);
}

function trackHeader(width: number, height: number, rotated = false) {
  const payload = Buffer.alloc(84);
  let offset = 0;
  payload.writeUInt32BE(0x00000007, offset); // version 0 + flags
  offset += 4;
  offset += 20; // creation, modification, trackID, reserved, duration
  offset += 16; // reserved, layer, alternate_group, volume, reserved
  const matrix = offset;
  if (rotated) {
    payload.writeUInt32BE(0x00010000, matrix + 4); // b
    payload.writeUInt32BE(0xffff0000, matrix + 12); // c
  } else {
    payload.writeUInt32BE(0x00010000, matrix); // a
    payload.writeUInt32BE(0x00010000, matrix + 16); // d
  }
  payload.writeUInt32BE(0x40000000, matrix + 32);
  offset += 36;
  payload.writeUInt32BE(width * 65536, offset);
  payload.writeUInt32BE(height * 65536, offset + 4);
  return box("tkhd", payload);
}

function fakeMp4(width: number, height: number, rotated = false) {
  const ftyp = box("ftyp", Buffer.from("isomiso2avc1", "ascii"));
  const silentAudioTrack = box("trak", trackHeader(0, 0));
  const videoTrack = box("trak", trackHeader(width, height, rotated));
  const moov = box("moov", Buffer.concat([silentAudioTrack, videoTrack]));
  return new Uint8Array(Buffer.concat([ftyp, moov]));
}

test("the authorize URL matches Tumblr's documented OAuth2 endpoint and scopes", () => {
  const url = new URL(
    buildTumblrAuthorizeUrl({
      clientId: "client-123",
      redirectUri: "https://dreamly.art/api/admin/tumblr/callback",
      state: "abc123",
    }),
  );
  assert.equal(`${url.origin}${url.pathname}`, TUMBLR_AUTHORIZE_URL);
  assert.equal(url.searchParams.get("client_id"), "client-123");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "abc123");
  assert.equal(url.searchParams.get("redirect_uri"), "https://dreamly.art/api/admin/tumblr/callback");
  // offline_access is what makes Tumblr issue a refresh token.
  assert.equal(url.searchParams.get("scope"), "basic write offline_access");
  assert.equal(TUMBLR_SCOPE_STRING, "basic write offline_access");
  // The secret must never travel in the browser redirect.
  assert.equal(url.searchParams.get("client_secret"), null);
});

test("access tokens are refreshed before they actually expire", () => {
  const now = Date.parse("2026-09-03T12:00:00.000Z");
  assert.equal(tumblrTokenExpiryIso(3600, now), "2026-09-03T13:00:00.000Z");
  // Missing/garbage expiry falls back to an hour rather than to "never".
  assert.equal(tumblrTokenExpiryIso(undefined, now), "2026-09-03T13:00:00.000Z");
  assert.equal(isTumblrAccessTokenStale("2026-09-03T13:00:00.000Z", now), false);
  assert.equal(isTumblrAccessTokenStale("2026-09-03T12:04:00.000Z", now), true);
  assert.equal(isTumblrAccessTokenStale("", now), true);
});

test("the blog is discovered from /v2/user/info without manual configuration", () => {
  const blogs = normalizeTumblrBlogs([
    { name: "dreamly", title: "Dreamly", url: "https://dreamly.tumblr.com/", primary: true, admin: true },
    { name: "sidekick", title: "Side", url: "https://sidekick.tumblr.com/", primary: false, admin: true },
  ]);
  assert.equal(blogs[0].identifier, "dreamly.tumblr.com");

  const primary = selectTumblrBlog(blogs);
  assert.equal(primary.blog?.identifier, "dreamly.tumblr.com");
  assert.equal(primary.reason, "primary");
  // Several blogs are reported so the admin status can surface them.
  assert.equal(primary.ambiguous, true);

  const single = selectTumblrBlog([blogs[1]]);
  assert.equal(single.blog?.identifier, "sidekick.tumblr.com");
  assert.equal(single.reason, "single");
  assert.equal(single.ambiguous, false);

  const overridden = selectTumblrBlog(blogs, "sidekick");
  assert.equal(overridden.blog?.identifier, "sidekick.tumblr.com");
  assert.equal(overridden.reason, "override");

  assert.equal(selectTumblrBlog([]).blog, null);
  assert.equal(normalizeTumblrBlogIdentifier({ url: "https://blog.dreamly.art/" }), "blog.dreamly.art");
});

test("tags come from the metadata Dreamly already generated", () => {
  const tags = buildTumblrTags({
    hashtags: ["#dreams", "dreammeaning"],
    tags: ["snake dream", "dreams", "dream symbols"],
    topic: "Snake dream",
  });
  assert.deepEqual(tags, ["dreams", "dreammeaning", "snake dream", "dream symbols", "Dreamly"]);
  // No duplicates, no leading hashes, and nothing that would break the
  // comma-separated tag list Tumblr expects.
  assert.equal(new Set(tags.map((tag) => tag.toLowerCase())).size, tags.length);
  assert.ok(tags.every((tag) => !tag.includes(",") && !tag.startsWith("#")));
  assert.ok(tags.length <= 10);

  const fallback = buildTumblrTags({ topic: "Falling dream" });
  assert.equal(fallback[0], "Falling dream");
  assert.ok(fallback.includes("dream interpretation"));
});

test("the NPF body binds the video block to the multipart media field", () => {
  const post = buildTumblrNpfPost({
    text: "Snake dream meaning\n\n🌙 Understand your dreams with AI\n👉 https://dreamly.art",
    tags: ["dreams", "Dreamly"],
    width: 1080,
    height: 1920,
  });
  assert.equal(post.state, "published");
  assert.equal(post.tags, "dreams,Dreamly");
  const video = post.content[0];
  assert.equal(video.type, "video");
  assert.ok(video.type === "video");
  assert.equal(video.media.type, "video/mp4");
  assert.equal(video.media.identifier, TUMBLR_MEDIA_IDENTIFIER);
  assert.equal(video.media.width, 1080);
  assert.equal(video.media.height, 1920);
  assert.equal(post.content[1].type, "text");

  const mp4 = fakeMp4(1080, 1920);
  const boundary = "----DreamlyTumblrTestBoundary";
  const multipart = buildTumblrMultipartBody(post, mp4, { boundary });
  const body = Buffer.from(multipart.body);
  const serialized = body.toString("latin1");

  assert.equal(multipart.contentType, `multipart/form-data; boundary=${boundary}`);
  assert.match(
    serialized,
    new RegExp(
      `--${boundary}\\r\\n` +
        `Content-Disposition: form-data; name="json"\\r\\n` +
        `Content-Type: application/json\\r\\n\\r\\n`,
    ),
  );
  // The JSON part is a regular field, not a file. Giving it a filename makes
  // Tumblr validate the JSON itself as media and return error 400.8005.
  assert.doesNotMatch(serialized, /name="json"; filename=/);
  // The actual MP4 is the only file part, under the identifier referenced by
  // the NPF video block.
  const mediaHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${TUMBLR_MEDIA_IDENTIFIER}"; filename="${TUMBLR_MEDIA_FILENAME}"\r\n` +
    `Content-Type: video/mp4\r\n\r\n`;
  const mediaOffset = body.indexOf(Buffer.from(mediaHeader, "utf8"));
  assert.ok(mediaOffset >= 0);
  const mediaStart = mediaOffset + Buffer.byteLength(mediaHeader);
  assert.deepEqual(body.subarray(mediaStart, mediaStart + mp4.length), Buffer.from(mp4));
  assert.ok(serialized.endsWith(`\r\n--${boundary}--\r\n`));
});

test("unknown dimensions are omitted instead of invented", () => {
  const post = buildTumblrNpfPost({ text: "hi", tags: [], width: null, height: null });
  const video = post.content[0];
  assert.ok(video.type === "video");
  assert.equal(video.media.width, undefined);
  assert.equal(video.media.height, undefined);
});

test("video dimensions are read from the MP4 the pipeline produced", () => {
  const portrait = fakeMp4(1080, 1920);
  assert.equal(isMp4(portrait), true);
  assert.deepEqual(readMp4Dimensions(portrait), { width: 1080, height: 1920 });
  // A different renderer writes 720x1280 — the file stays the source of truth.
  assert.deepEqual(readMp4Dimensions(fakeMp4(720, 1280)), { width: 720, height: 1280 });
  // A 90° display matrix means the presented frame is transposed.
  assert.deepEqual(readMp4Dimensions(fakeMp4(1920, 1080, true)), { width: 1080, height: 1920 });
  assert.equal(readMp4Dimensions(new Uint8Array([1, 2, 3])), null);
  assert.equal(isMp4(new Uint8Array([1, 2, 3])), false);
});

test("temporary Tumblr failures are separated from permanent ones", () => {
  assert.equal(classifyTumblrError(429, "Limit Exceeded").retryable, true);
  assert.equal(classifyTumblrError(503, "Service Unavailable").retryable, true);
  assert.equal(
    classifyTumblrError(400, "Your previous video is still transcoding, try again later").retryable,
    true,
  );
  // A 24h quota is never cleared by a 5-minute retry loop.
  assert.equal(classifyTumblrError(403, "You have reached your daily video upload limit").retryable, false);
  assert.equal(classifyTumblrError(401, "Not Authorized").retryable, false);
  assert.equal(classifyTumblrError(400, "Unsupported media type").retryable, false);
  assert.equal(classifyTumblrError(400, "Unsupported media type").phase, "upload");
});

test("errors never carry credentials into Firestore, logs or API responses", () => {
  const message = sanitizeTumblrError(
    new Error('Tumblr rejected Bearer aBcD1234efgh_TOKEN and "refresh_token":"rTokenValue123"'),
    ["superSecretClientSecret"],
  );
  assert.ok(!message.includes("aBcD1234efgh_TOKEN"));
  assert.ok(!message.includes("rTokenValue123"));
  assert.equal(
    sanitizeTumblrError(new Error("boom superSecretClientSecret"), ["superSecretClientSecret"]),
    "boom ***",
  );
});

test("post ids and canonical urls are persisted as strings", () => {
  assert.equal(tumblrPostUrl("https://dreamly.tumblr.com/", "dreamly.tumblr.com", "123"), "https://dreamly.tumblr.com/post/123");
  assert.equal(tumblrPostUrl("", "dreamly.tumblr.com", "123"), "https://dreamly.tumblr.com/post/123");
  assert.equal(tumblrPostUrl("", "", ""), "");
  // The publish log reuses the canonical url Tumblr itself returned.
  assert.equal(
    publicPublishUrl("tumblr", { tumblrPostUrl: "https://dreamly.tumblr.com/post/9/slug" }),
    "https://dreamly.tumblr.com/post/9/slug",
  );
  assert.equal(publicPublishUrl("tumblr", {}), "");
  assert.equal(publishLogKey("video", "ai:job1", "tumblr"), "dreamly:video:ai:job1:tumblr");
  assert.equal(notionFormat("video", "tumblr"), "Video");
});

test("Tumblr joins the shared publish log and the automatic publish queue", () => {
  const rows = entriesFromVideoDoc("ai:job1", {
    topic: "Snake dream",
    tumblrPublishedAt: "2026-09-03T10:00:00.000Z",
    tumblrPostUrl: "https://dreamly.tumblr.com/post/42",
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].platform, "Tumblr");
  assert.equal(rows[0].url, "https://dreamly.tumblr.com/post/42");

  // Automatic distribution: Tumblr is one of the queued networks the cron
  // worker drains, next to the platforms that were already there.
  assert.ok(QUEUED_SCHEDULE_PLATFORMS.includes("tumblr"));
  assert.ok((SOCIAL_SCHEDULE_PLATFORMS as readonly string[]).includes("tumblr"));
  assert.deepEqual(normalizeSchedulePlatforms(["tumblr", "bluesky", "nope"]), ["bluesky", "tumblr"]);
});
