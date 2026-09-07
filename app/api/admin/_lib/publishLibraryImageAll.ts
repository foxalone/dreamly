import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { SHOW_PINTEREST_PUBLISH_ERRORS } from "@/lib/adminPinterest";
import {
  classifyImageSocialError,
  IMAGE_SOCIAL_PLATFORMS,
  type ImageSocialPlatform,
} from "@/lib/imageSocialPublish";
import { publishLibraryImageToMeta } from "@/app/api/admin/meta/_lib";
import { publishLibraryImageToPinterest } from "@/app/api/admin/pinterest/_lib";
import { publishLibraryImageToThreads } from "@/app/api/admin/threads/_lib";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export type ImageSocialPublishResult = {
  platform: ImageSocialPlatform;
  status: "published" | "skipped" | "failed";
  error?: string;
};

function alreadyPublished(data: Record<string, unknown>, platform: ImageSocialPlatform) {
  return Boolean(data[`${platform}PublishedAt`]) || data[`${platform}Status`] === "published";
}

async function publishOne(platform: ImageSocialPlatform, jobId: string, adminUid: string) {
  if (platform === "instagram" || platform === "facebook") {
    return publishLibraryImageToMeta(jobId, adminUid, platform);
  }
  if (platform === "threads") return publishLibraryImageToThreads(jobId, adminUid);
  return publishLibraryImageToPinterest(jobId, adminUid);
}

export async function publishLibraryImageToAll(jobId: string, adminUid: string) {
  const snapshot = await adminDb().collection(AI_IMAGE_COLLECTION).doc(jobId).get();
  const data = (snapshot.data() || {}) as Record<string, unknown>;
  const results: ImageSocialPublishResult[] = [];

  for (const platform of IMAGE_SOCIAL_PLATFORMS) {
    if (alreadyPublished(data, platform)) {
      results.push({ platform, status: "skipped" });
      continue;
    }
    try {
      await publishOne(platform, jobId, adminUid);
      data[`${platform}PublishedAt`] = new Date().toISOString();
      data[`${platform}Status`] = "published";
      results.push({ platform, status: "published" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed";
      const kind = classifyImageSocialError(message);
      if (kind === "already") {
        data[`${platform}PublishedAt`] = data[`${platform}PublishedAt`] || new Date().toISOString();
        results.push({ platform, status: "skipped" });
        continue;
      }
      if (kind === "disconnected") {
        results.push({ platform, status: "skipped", error: "disconnected" });
        continue;
      }
      if (platform === "pinterest" && !SHOW_PINTEREST_PUBLISH_ERRORS) {
        results.push({ platform, status: "skipped", error: message });
        continue;
      }
      results.push({ platform, status: "failed", error: message });
    }
  }

  return results;
}
