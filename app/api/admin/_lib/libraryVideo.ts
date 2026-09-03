import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import { appendDreamlySocialCta } from "@/lib/socialCta";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { trackDreamlyPublish } from "@/app/api/admin/_lib/notionPublishLog";

export type LibraryVideo = {
  kind: "free" | "ai";
  jobId: string;
  collection: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  topic: string;
  hashtags: string;
  // The raw generated keyword lists, kept alongside the rendered `hashtags`
  // string so a platform that wants real tag arrays (Tumblr) does not have to
  // re-parse them or invent its own.
  hashtagList: string[];
  tags: string[];
  // The description written by the video generation pipeline
  // (youtubeMetadata.description). Empty for jobs generated before it existed.
  description: string;
  caption: string;
};

export function buildDreamCaption(title: string, topic: string, hashtags: string, maxLen = 2200) {
  const headline = String(title || topic || "Dream meaning").trim().slice(0, 120);
  const body = hashtags ? `${headline}\n\n${hashtags}` : `${headline}\n\n#dreams #dreammeaning #dreamly`;
  return appendDreamlySocialCta(body, maxLen);
}

export type LibraryPublishPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "threads"
  | "bluesky"
  | "youtube"
  | "pinterest"
  | "tumblr";

function parseLibraryId(libraryId: string): { kind: LibraryVideo["kind"]; rawId: string; collection: string } {
  const [rawKind, rawId] = libraryId.split(":");
  if (!rawId || (rawKind !== "free" && rawKind !== "ai")) {
    throw new Error("Invalid video id");
  }
  const kind: LibraryVideo["kind"] = rawKind;
  return { kind, rawId, collection: kind === "free" ? "adminVideoJobs" : AI_VIDEO_COLLECTION };
}

export async function markLibraryVideoPublishedManually(
  libraryId: string,
  platform: LibraryPublishPlatform,
  adminUid: string,
) {
  const { rawId, collection } = parseLibraryId(libraryId);
  const ref = adminDb().collection(collection).doc(rawId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("Video not found");

  const data = snapshot.data() as Record<string, unknown>;
  const publishedAtField = `${platform}PublishedAt`;
  if (data[publishedAtField]) throw new Error(`This video is already marked as published to ${platform}`);

  const now = new Date().toISOString();
  const patch: Record<string, string | boolean> = {
    [publishedAtField]: now,
    [`${platform}PublishedBy`]: adminUid,
    [`${platform}PublishedManually`]: true,
  };

  if (platform === "threads") {
    patch.threadsStatus = "published";
    patch.threadsError = "";
  }
  if (platform === "bluesky") {
    patch.blueskyStatus = "published";
    patch.blueskyError = "";
  }
  if (platform === "youtube") {
    patch.youtubeStatus = "published";
    patch.youtubeError = "";
    patch.youtubeScheduledAt = "";
  }
  if (platform === "pinterest") {
    patch.pinterestStatus = "published";
    patch.pinterestError = "";
  }
  if (platform === "tumblr") {
    patch.tumblrStatus = "published";
    patch.tumblrError = "";
  }

  await ref.set(patch, { merge: true });
  const title = String(
    (data.youtubeMetadata as { title?: string } | undefined)?.title || data.topic || "Untitled video",
  ).trim();
  await trackDreamlyPublish({
    kind: "video",
    assetId: libraryId,
    platform,
    title,
    publishedAt: now,
    notes: `video ${libraryId} manual`,
  });
  return { ok: true as const, platform, publishedAt: now };
}

export async function loadLibraryVideo(libraryId: string, captionMaxLen = 2200): Promise<LibraryVideo> {
  const { kind, rawId, collection } = parseLibraryId(libraryId);
  const snapshot = await adminDb().collection(collection).doc(rawId).get();
  if (!snapshot.exists) throw new Error("Video not found");
  const data = snapshot.data() as {
    status?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    topic?: string;
    youtubeMetadata?: { title?: string; hashtags?: string[]; tags?: string[]; description?: string };
  };
  const videoUrl = String(data.videoUrl || "");
  if (data.status !== "completed" || !videoUrl) throw new Error("Video is not ready");
  const title = String(data.youtubeMetadata?.title || data.topic || "Dreamly Short").trim();
  const hashtagList = Array.isArray(data.youtubeMetadata?.hashtags)
    ? data.youtubeMetadata!.hashtags.map((tag) => String(tag).replace(/^#/, "").trim()).filter(Boolean)
    : [];
  const tags = Array.isArray(data.youtubeMetadata?.tags)
    ? data.youtubeMetadata!.tags.map((tag) => String(tag).replace(/^#/, "").trim()).filter(Boolean)
    : [];
  const hashtags = hashtagList.map((tag) => `#${tag}`).join(" ");
  return {
    kind,
    jobId: rawId,
    collection,
    videoUrl,
    thumbnailUrl: String(data.thumbnailUrl || ""),
    title,
    topic: String(data.topic || ""),
    hashtags,
    hashtagList,
    tags,
    description: String(data.youtubeMetadata?.description || "").trim(),
    caption: buildDreamCaption(title, String(data.topic || ""), hashtags, captionMaxLen),
  };
}
