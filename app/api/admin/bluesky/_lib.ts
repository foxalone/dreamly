import { FieldValue } from "firebase-admin/firestore";

import {
  BLUESKY_PUBLISH_LOCK_MS,
  BlueskyPublishError,
  authenticateBluesky,
  blueskyConfig,
  blueskyPostUrl,
  buildBlueskyCaption,
  buildBlueskyPublishedPatch,
  buildBlueskyRkey,
  createBlueskyVideoPost,
  downloadBlueskyVideo,
  getBlueskyUploadLimits,
  sanitizeBlueskyError,
  uploadBlueskyVideo,
  waitForBlueskyVideoProcessing,
  type AuthenticatedBluesky,
  type BlueskyConnectionStatus,
} from "@/lib/adminBluesky";
import { SocialPublishPendingError } from "@/lib/socialPublishPending";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { loadLibraryVideo } from "@/app/api/admin/_lib/libraryVideo";
import { trackDreamlyPublish } from "@/app/api/admin/_lib/notionPublishLog";

const READINESS_CACHE_MS = 5 * 60 * 1000;

let readinessCache: { expiresAt: number; value: BlueskyConnectionStatus } | null = null;

function emptyStatus(error: string, handle = "") : BlueskyConnectionStatus {
  return {
    configured: false,
    connected: false,
    ready: false,
    handle,
    did: "",
    emailConfirmed: false,
    canUpload: false,
    remainingDailyVideos: null,
    remainingDailyBytes: null,
    message: "",
    error,
  };
}

export async function getBlueskyStatus(force = false): Promise<BlueskyConnectionStatus> {
  if (!force && readinessCache && readinessCache.expiresAt > Date.now()) return readinessCache.value;

  let configured: ReturnType<typeof blueskyConfig>;
  try {
    configured = blueskyConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bluesky is not configured";
    const status = emptyStatus(message, String(process.env.BLUESKY_HANDLE || "").trim());
    readinessCache = { expiresAt: Date.now() + 30_000, value: status };
    return status;
  }

  let auth: AuthenticatedBluesky | null = null;
  try {
    auth = await authenticateBluesky(configured);
    const limits = await getBlueskyUploadLimits(auth);
    const ready = auth.emailConfirmed && limits.canUpload;
    const status: BlueskyConnectionStatus = {
      configured: true,
      connected: true,
      ready,
      handle: auth.handle,
      did: auth.did,
      emailConfirmed: auth.emailConfirmed,
      canUpload: limits.canUpload,
      remainingDailyVideos: Number.isFinite(limits.remainingDailyVideos) ? Number(limits.remainingDailyVideos) : null,
      remainingDailyBytes: Number.isFinite(limits.remainingDailyBytes) ? Number(limits.remainingDailyBytes) : null,
      message: String(limits.message || ""),
      error: ready
        ? ""
        : !auth.emailConfirmed
          ? "Bluesky account email is not verified"
          : String(limits.message || limits.error || "Bluesky video publishing is unavailable"),
    };
    readinessCache = { expiresAt: Date.now() + READINESS_CACHE_MS, value: status };
    return status;
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Bluesky API unavailable";
    const message = error instanceof BlueskyPublishError && error.phase === "authentication"
      ? `Authentication failed: ${raw}`
      : `Bluesky API unavailable: ${raw}`;
    const status: BlueskyConnectionStatus = {
      ...emptyStatus(sanitizeBlueskyError(message, [configured.appPassword]), auth?.handle || configured.handle),
      configured: true,
      connected: Boolean(auth),
      handle: auth?.handle || configured.handle,
      did: auth?.did || "",
      emailConfirmed: auth?.emailConfirmed || false,
    };
    readinessCache = { expiresAt: Date.now() + 30_000, value: status };
    return status;
  }
}

type ExistingBlueskyPost = { uri: string; cid: string };

async function existingBlueskyPost(auth: AuthenticatedBluesky, rkey: string): Promise<ExistingBlueskyPost | null> {
  try {
    const response = await auth.agent.com.atproto.repo.getRecord({
      repo: auth.did,
      collection: "app.bsky.feed.post",
      rkey,
    });
    return response.data.uri ? { uri: response.data.uri, cid: String(response.data.cid || "") } : null;
  } catch (error) {
    const source = error as { error?: string; status?: number; message?: string };
    if (source.error === "RecordNotFound" || source.status === 400 && /not found/i.test(String(source.message || ""))) {
      return null;
    }
    throw new BlueskyPublishError(
      "publishing",
      sanitizeBlueskyError(error instanceof Error ? error.message : "Could not verify the Bluesky post"),
      !source.status || source.status === 408 || source.status === 429 || source.status >= 500,
    );
  }
}

async function persistPublished(
  input: {
    jobRef: FirebaseFirestore.DocumentReference;
    libraryId: string;
    title: string;
    auth: AuthenticatedBluesky;
    uri: string;
    cid: string;
    adminUid: string;
  },
) {
  const publishedAt = new Date().toISOString();
  const patch = buildBlueskyPublishedPatch({
    uri: input.uri,
    cid: input.cid,
    did: input.auth.did,
    handle: input.auth.handle,
    adminUid: input.adminUid,
    publishedAt,
  });
  await input.jobRef.set(
    {
      ...patch,
      blueskyPublishStartedAt: FieldValue.delete(),
      blueskyVideoJobId: FieldValue.delete(),
    },
    { merge: true },
  );
  await trackDreamlyPublish({
    kind: "video",
    assetId: input.libraryId,
    platform: "bluesky",
    title: input.title,
    publishedAt,
    url: patch.blueskyPostUrl,
    notes: `video ${input.libraryId} · ${patch.blueskyUri} · ${patch.blueskyCid}`,
  });
  return patch;
}

export async function publishLibraryVideoToBluesky(
  libraryId: string,
  adminUid: string,
  options?: { deadlineMs?: number },
) {
  const video = await loadLibraryVideo(libraryId, 300);
  const auth = await authenticateBluesky();
  const rkey = buildBlueskyRkey(libraryId);
  const jobRef = adminDb().collection(video.collection).doc(video.jobId);

  const existing = await existingBlueskyPost(auth, rkey);
  if (existing) {
    const patch = await persistPublished({
      jobRef,
      libraryId,
      title: video.title,
      auth,
      uri: existing.uri,
      cid: existing.cid,
      adminUid,
    });
    return {
      target: "bluesky" as const,
      status: "PUBLISHED" as const,
      recovered: true,
      uri: existing.uri,
      cid: existing.cid,
      rkey,
      postUrl: patch.blueskyPostUrl,
      handle: auth.handle,
    };
  }

  const initial = (await jobRef.get()).data() as {
    blueskyPublishedAt?: string;
    blueskyStatus?: string;
    blueskyPublishStartedAt?: string;
    blueskyVideoJobId?: string;
  } | undefined;
  if (initial?.blueskyPublishedAt || initial?.blueskyStatus === "published") {
    throw new Error("This video is already published to Bluesky");
  }

  const startedAt = new Date().toISOString();
  let jobId = String(initial?.blueskyVideoJobId || "");
  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(jobRef);
    const data = (snapshot.data() || {}) as {
      blueskyPublishedAt?: string;
      blueskyStatus?: string;
      blueskyPublishStartedAt?: string;
      blueskyVideoJobId?: string;
    };
    if (data.blueskyPublishedAt || data.blueskyStatus === "published") {
      throw new Error("This video is already published to Bluesky");
    }
    jobId = String(data.blueskyVideoJobId || jobId);
    if (["uploading", "processing", "publishing"].includes(String(data.blueskyStatus || ""))) {
      const lockedAt = Date.parse(data.blueskyPublishStartedAt || "") || 0;
      if (Date.now() - lockedAt < BLUESKY_PUBLISH_LOCK_MS) {
        throw new SocialPublishPendingError("A Bluesky publish is already running for this video");
      }
    }
    transaction.set(
      jobRef,
      {
        blueskyStatus: jobId ? "processing" : "uploading",
        blueskyPublishStartedAt: startedAt,
        blueskyPublishedBy: adminUid,
        blueskyError: "",
        blueskyRkey: rkey,
      },
      { merge: true },
    );
  });

  const caption = buildBlueskyCaption({
    title: video.title,
    topic: video.topic,
    description: video.description,
  });
  const alt = [video.title, video.topic && video.topic !== video.title ? `Dream topic: ${video.topic}` : ""]
    .filter(Boolean)
    .join(". ");

  try {
    const limits = await getBlueskyUploadLimits(auth);
    if (!auth.emailConfirmed) throw new BlueskyPublishError("readiness", "Bluesky account email is not verified");
    if (!limits.canUpload) {
      throw new BlueskyPublishError(
        "readiness",
        String(limits.message || limits.error || "Bluesky account cannot upload video"),
      );
    }
    if (limits.remainingDailyVideos !== undefined && limits.remainingDailyVideos <= 0) {
      throw new BlueskyPublishError("readiness", "Bluesky account video upload limit reached");
    }

    let initialJob = null;
    if (!jobId) {
      const bytes = await downloadBlueskyVideo(video.videoUrl, limits);
      initialJob = await uploadBlueskyVideo(auth, bytes, `${rkey}.mp4`);
      jobId = initialJob.jobId;
      await jobRef.set(
        {
          blueskyStatus: "processing",
          blueskyVideoJobId: jobId,
          blueskyVideoJobState: initialJob.state,
          blueskyError: "",
        },
        { merge: true },
      );
    }
    const blob = await waitForBlueskyVideoProcessing(jobId, {
      initial: initialJob,
      deadlineMs: options?.deadlineMs,
    });
    await jobRef.set({ blueskyStatus: "publishing", blueskyError: "" }, { merge: true });

    // Recheck the deterministic record immediately before create. This closes
    // the post-created/Firestore-write-failed window without making duplicates.
    const raced = await existingBlueskyPost(auth, rkey);
    const post = raced || await createBlueskyVideoPost({ auth, text: caption, blob, alt, rkey });
    const patch = await persistPublished({
      jobRef,
      libraryId,
      title: video.title,
      auth,
      uri: post.uri,
      cid: post.cid,
      adminUid,
    });
    return {
      target: "bluesky" as const,
      status: "PUBLISHED" as const,
      uri: post.uri,
      cid: post.cid,
      rkey,
      postUrl: patch.blueskyPostUrl,
      handle: auth.handle,
      caption,
    };
  } catch (error) {
    if (error instanceof SocialPublishPendingError) throw error;
    const configured = (() => {
      try { return blueskyConfig(); } catch { return { appPassword: "" }; }
    })();
    const message = sanitizeBlueskyError(error, [configured.appPassword]);
    if (error instanceof BlueskyPublishError && error.retryable) {
      await jobRef.set(
        {
          blueskyStatus: jobId ? "processing" : "failed",
          blueskyError: message,
          blueskyPublishStartedAt: FieldValue.delete(),
        },
        { merge: true },
      ).catch(() => undefined);
      throw new SocialPublishPendingError(message);
    }
    await jobRef.set(
      { blueskyStatus: "failed", blueskyError: message, blueskyPublishStartedAt: FieldValue.delete() },
      { merge: true },
    ).catch(() => undefined);
    throw error;
  }
}

export function blueskyResultUrl(handle: string, uri: string) {
  return blueskyPostUrl(handle, uri);
}
