import assert from "node:assert/strict";
import test from "node:test";

import type { Agent, BlobRef, CredentialSession } from "@atproto/api";

import { getBlueskyStatus } from "../app/api/admin/bluesky/_lib";
import {
  BLUESKY_POST_GRAPHEME_LIMIT,
  BlueskyPublishError,
  authenticateBluesky,
  blueskyPostUrl,
  buildBlueskyCaption,
  buildBlueskyPublishedPatch,
  buildBlueskyRkey,
  createBlueskyVideoPost,
  downloadBlueskyVideo,
  isValidBlueskyRkey,
  normalizeBlueskyJobStatus,
  resolveBlueskyRkey,
  sanitizeBlueskyError,
  uploadBlueskyVideo,
  waitForBlueskyVideoProcessing,
  type AuthenticatedBluesky,
} from "./adminBluesky";

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...(headers || {}) },
  });
}

function mp4Bytes() {
  return new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
}

function blobRef() {
  return {
    ref: { $link: "bafyreiblueskytest" },
    mimeType: "video/mp4",
    size: 12,
  } as unknown as BlobRef;
}

function authWith(overrides?: Partial<AuthenticatedBluesky>) {
  const agent = {
    com: {
      atproto: {
        server: {
          getServiceAuth: async () => ({ data: { token: "service-token" } }),
        },
      },
    },
  } as unknown as Agent;
  return {
    agent,
    session: { dispatchUrl: new URL("https://pds.example.com") } as CredentialSession,
    did: "did:plc:dreamly",
    handle: "dreamly.art",
    emailConfirmed: true,
    ...overrides,
  } satisfies AuthenticatedBluesky;
}

function sdkFetch(options?: { loginStatus?: number; profileHandle?: string; uploadAllowed?: boolean }) {
  return (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.endsWith("/com.atproto.server.createSession")) {
      if (options?.loginStatus) return json({ error: "AuthenticationRequired", message: "Invalid identifier or password" }, options.loginStatus);
      return json({
        did: "did:plc:dreamly",
        handle: "dreamly.art",
        accessJwt: "access-token",
        refreshJwt: "refresh-token",
      });
    }
    if (url.pathname.endsWith("/app.bsky.actor.getProfile")) {
      return json({ did: "did:plc:dreamly", handle: options?.profileHandle || "dreamly.art" });
    }
    if (url.pathname.endsWith("/com.atproto.server.getSession")) {
      return json({ did: "did:plc:dreamly", handle: "dreamly.art", emailConfirmed: true });
    }
    if (url.pathname.endsWith("/com.atproto.server.getServiceAuth")) {
      return json({ token: "service-token" });
    }
    if (url.pathname.endsWith("/app.bsky.video.getUploadLimits")) {
      return json({
        canUpload: options?.uploadAllowed !== false,
        remainingDailyVideos: options?.uploadAllowed === false ? 0 : 3,
        remainingDailyBytes: 400_000_000,
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
}

async function withBlueskyEnv(run: () => Promise<void>) {
  const previousHandle = process.env.BLUESKY_HANDLE;
  const previousPassword = process.env.BLUESKY_APP_PASSWORD;
  process.env.BLUESKY_HANDLE = "dreamly.art";
  process.env.BLUESKY_APP_PASSWORD = "test-app-password";
  try {
    await run();
  } finally {
    if (previousHandle === undefined) delete process.env.BLUESKY_HANDLE;
    else process.env.BLUESKY_HANDLE = previousHandle;
    if (previousPassword === undefined) delete process.env.BLUESKY_APP_PASSWORD;
    else process.env.BLUESKY_APP_PASSWORD = previousPassword;
  }
}

test("missing BLUESKY_HANDLE fails before authentication", async () => {
  await assert.rejects(
    authenticateBluesky({ handle: "", appPassword: "secret", fetchImpl: sdkFetch() }),
    /Missing BLUESKY_HANDLE/,
  );
});

test("missing BLUESKY_APP_PASSWORD fails before authentication", async () => {
  await assert.rejects(
    authenticateBluesky({ handle: "dreamly.art", appPassword: "", fetchImpl: sdkFetch() }),
    /Missing BLUESKY_APP_PASSWORD/,
  );
});

test("successful authentication verifies DID, handle and email", async () => {
  const auth = await authenticateBluesky({
    handle: "@dreamly.art",
    appPassword: "secret",
    fetchImpl: sdkFetch(),
  });
  assert.equal(auth.did, "did:plc:dreamly");
  assert.equal(auth.handle, "dreamly.art");
  assert.equal(auth.emailConfirmed, true);
});

test("authentication failure is classified and does not expose password", async () => {
  const password = "private-app-password";
  await assert.rejects(
    authenticateBluesky({ handle: "dreamly.art", appPassword: password, fetchImpl: sdkFetch({ loginStatus: 401 }) }),
    (error: unknown) => {
      assert.ok(error instanceof BlueskyPublishError);
      assert.equal(error.phase, "authentication");
      assert.doesNotMatch(error.message, new RegExp(password));
      return true;
    },
  );
});

test("unexpected authenticated account is rejected", async () => {
  await assert.rejects(
    authenticateBluesky({ handle: "dreamly.art", appPassword: "secret", fetchImpl: sdkFetch({ profileHandle: "other.test" }) }),
    /Unexpected Bluesky account/,
  );
});

test("readiness authenticates, checks upload limits and omits secrets", async () => {
  await withBlueskyEnv(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = sdkFetch();
    try {
      const status = await getBlueskyStatus(true);
      assert.equal(status.connected, true);
      assert.equal(status.ready, true);
      assert.equal(status.canUpload, true);
      assert.equal(status.did, "did:plc:dreamly");
      const serialized = JSON.stringify(status);
      assert.doesNotMatch(serialized, /test-app-password|access-token|refresh-token|service-token/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("video fetch accepts an accessible non-empty MP4", async () => {
  const bytes = mp4Bytes();
  const video = await downloadBlueskyVideo(
    "https://storage.example/video.mp4",
    undefined,
    (async () => new Response(bytes, { headers: { "content-type": "video/mp4", "content-length": String(bytes.length) } })) as typeof fetch,
  );
  assert.equal(video.size, bytes.length);
  assert.equal(video.contentType, "video/mp4");
});

test("video fetch failure is explicit", async () => {
  await assert.rejects(
    downloadBlueskyVideo(
      "https://storage.example/video.mp4",
      undefined,
      (async () => new Response("missing", { status: 404 })) as typeof fetch,
    ),
    /MP4 download failed \(404\)/,
  );
});

test("video fetch rejects incompatible MIME and invalid MP4 bytes", async () => {
  await assert.rejects(
    downloadBlueskyVideo(
      "https://storage.example/video.mp4",
      undefined,
      (async () => new Response("hello", { headers: { "content-type": "text/plain" } })) as typeof fetch,
    ),
    /Unsupported video MIME type/,
  );
  await assert.rejects(
    downloadBlueskyVideo(
      "https://storage.example/video.mp4",
      undefined,
      (async () => new Response(new Uint8Array(20), { headers: { "content-type": "video\/mp4" } })) as typeof fetch,
    ),
    /not a valid MP4/,
  );
});

test("successful video upload requests PDS service auth and returns processing job", async () => {
  let serviceAuthParams: unknown;
  const auth = authWith({
    agent: {
      com: { atproto: { server: { getServiceAuth: async (params: unknown) => {
        serviceAuthParams = params;
        return { data: { token: "service-token" } };
      } } } },
    } as unknown as Agent,
  });
  let authorization = "";
  const job = await uploadBlueskyVideo(
    auth,
    { bytes: mp4Bytes(), size: 12, contentType: "video/mp4" },
    "dreamly.mp4",
    (async (_input, init) => {
      authorization = new Headers(init?.headers).get("authorization") || "";
      return json({ jobId: "job-1", did: auth.did, state: "JOB_STATE_CREATED" });
    }) as typeof fetch,
  );
  assert.equal(job.jobId, "job-1");
  assert.deepEqual(serviceAuthParams, {
    aud: "did:web:pds.example.com",
    lxm: "com.atproto.repo.uploadBlob",
    exp: (serviceAuthParams as { exp: number }).exp,
  });
  assert.equal(authorization, "Bearer service-token");
});

test("video upload API failure is classified separately", async () => {
  await assert.rejects(
    uploadBlueskyVideo(
      authWith(),
      { bytes: mp4Bytes(), size: 12, contentType: "video/mp4" },
      "dreamly.mp4",
      (async () => json({ message: "unsupported media" }, 400)) as typeof fetch,
    ),
    (error: unknown) => error instanceof BlueskyPublishError && error.phase === "upload" && error.status === 400,
  );
});

test("processing polling observes a started job and eventually returns BlobRef", async () => {
  let calls = 0;
  const blob = blobRef();
  const result = await waitForBlueskyVideoProcessing("job-2", {
    pollIntervalMs: 100,
    timeoutMs: 1_000,
    fetchImpl: (async () => {
      calls += 1;
      return json({ jobStatus: calls === 1
        ? { jobId: "job-2", did: "did:plc:dreamly", state: "JOB_STATE_ENCODING" }
        : { jobId: "job-2", did: "did:plc:dreamly", state: "JOB_STATE_COMPLETED", blob } });
    }) as typeof fetch,
  });
  assert.deepEqual(result, blob);
  assert.equal(calls, 2);
});

test("flat and wrapped processing responses both normalize", () => {
  assert.equal(normalizeBlueskyJobStatus({ jobId: "flat", did: "did:x", state: "JOB_STATE_CREATED" })?.jobId, "flat");
  assert.equal(normalizeBlueskyJobStatus({ jobStatus: { jobId: "wrapped", did: "did:x", state: "JOB_STATE_CREATED" } })?.jobId, "wrapped");
});

test("processing returns a BlobRef even when already_exists is represented as failure", async () => {
  const blob = blobRef();
  const result = await waitForBlueskyVideoProcessing("job-3", {
    initial: { jobId: "job-3", did: "did:plc:dreamly", state: "JOB_STATE_FAILED", error: "already_exists", blob },
  });
  assert.equal(result, blob);
});

test("processing failure is terminal and distinct", async () => {
  await assert.rejects(
    waitForBlueskyVideoProcessing("job-4", {
      pollIntervalMs: 100,
      timeoutMs: 1_000,
      fetchImpl: (async () => json({ jobStatus: {
        jobId: "job-4",
        did: "did:plc:dreamly",
        state: "JOB_STATE_FAILED",
        failureCode: "encoding_failure",
      } })) as typeof fetch,
    }),
    /processing failed: encoding_failure/,
  );
});

test("processing polling has a bounded timeout", async () => {
  await assert.rejects(
    waitForBlueskyVideoProcessing("job-5", {
      pollIntervalMs: 100,
      timeoutMs: 100,
      fetchImpl: (async () => json({ jobStatus: { jobId: "job-5", did: "did:plc:dreamly", state: "JOB_STATE_ENCODING" } })) as typeof fetch,
    }),
    (error: unknown) => error instanceof BlueskyPublishError && error.phase === "processing" && error.retryable,
  );
});

test("successful post creation embeds video, aspect ratio and clickable Unicode-safe facet", async () => {
  let record: Record<string, unknown> = {};
  const auth = authWith({
    agent: {
      app: { bsky: { feed: { post: { create: async (_params: unknown, input: Record<string, unknown>) => {
        record = input;
        return { uri: "at://did:plc:dreamly/app.bsky.feed.post/3jzfcijpj2z2a", cid: "cid-1" };
      } } } } },
    } as unknown as Agent,
  });
  const result = await createBlueskyVideoPost({
    auth,
    text: "Сон о полёте 🌙\n\nhttps://dreamly.art",
    blob: blobRef(),
    alt: "Flying dream meaning",
    rkey: "3jzfcijpj2z2a",
    createdAt: "2026-09-02T10:00:00.000Z",
  });
  assert.equal(result.cid, "cid-1");
  assert.equal((record.embed as { $type?: string }).$type, "app.bsky.embed.video");
  assert.deepEqual((record.embed as { aspectRatio?: unknown }).aspectRatio, { width: 720, height: 1280 });
  const facets = record.facets as Array<{ features: Array<{ uri?: string }> }>;
  assert.equal(facets[0].features[0].uri, "https://dreamly.art");
});

test("post creation failure is classified separately", async () => {
  const auth = authWith({
    agent: { app: { bsky: { feed: { post: { create: async () => { throw new Error("write denied"); } } } } } } as unknown as Agent,
  });
  await assert.rejects(
    createBlueskyVideoPost({ auth, text: "Dream\n\nhttps://dreamly.art", blob: blobRef(), alt: "Dream", rkey: "3jzfcijpj2z2a" }),
    (error: unknown) => error instanceof BlueskyPublishError && error.phase === "publishing" && /write denied/.test(error.message),
  );
});

test("caption intelligently shortens text and always preserves dreamly.art", () => {
  const caption = buildBlueskyCaption({
    title: "What does dreaming about a mysterious blue butterfly mean? 🌙",
    description: `This interpretation connects transformation, freedom, and a new direction. ${"Long context ".repeat(80)}`,
  });
  const length = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(caption)].length;
  assert.ok(length <= BLUESKY_POST_GRAPHEME_LIMIT);
  assert.match(caption, /mysterious blue butterfly/);
  assert.match(caption, /https:\/\/dreamly\.art$/);
});

test("post rkeys are valid TIDs and persisted TIDs protect retries from duplicate posts", () => {
  const generated = buildBlueskyRkey();
  assert.equal(isValidBlueskyRkey(generated), true);
  assert.equal(generated.length, 13);
  assert.equal(resolveBlueskyRkey(generated), generated);
  assert.equal(isValidBlueskyRkey(resolveBlueskyRkey("dreamly-ai-job_123")), true);
});

test("successful result patch persists URI, CID, handle and public URL", () => {
  const uri = "at://did:plc:dreamly/app.bsky.feed.post/3jzfcijpj2z2a";
  const patch = buildBlueskyPublishedPatch({
    uri,
    cid: "cid-success",
    did: "did:plc:dreamly",
    handle: "dreamly.art",
    adminUid: "admin-1",
    publishedAt: "2026-09-02T10:00:00.000Z",
  });
  assert.equal(patch.blueskyStatus, "published");
  assert.equal(patch.blueskyUri, uri);
  assert.equal(patch.blueskyCid, "cid-success");
  assert.equal(patch.blueskyPostUrl, "https://bsky.app/profile/dreamly.art/post/3jzfcijpj2z2a");
  assert.equal(blueskyPostUrl("dreamly.art", uri), patch.blueskyPostUrl);
});

test("error sanitization removes app passwords and authorization tokens", () => {
  const cleaned = sanitizeBlueskyError(
    new Error("password secret-value Authorization Bearer eyJ.private.token serviceToken=abc123"),
    ["secret-value"],
  );
  assert.doesNotMatch(cleaned, /secret-value|eyJ\.private\.token|abc123/);
});
