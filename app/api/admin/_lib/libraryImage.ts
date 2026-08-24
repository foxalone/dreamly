import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { DREAM_PAGE_IMAGE_COLLECTION } from "@/lib/dreamPageImage";
import { findDreamEntryFromSubject, interpretationLead } from "@/lib/dreamImageTarget";
import { getDreamEntry } from "@/lib/dream-dictionary";
import {
  buildDreamImageCaption,
  dreamPageUrl,
  IMAGE_CAPTION_LIMIT,
} from "@/lib/socialImageCaption";
import { adminDb, ensureAdmin } from "@/app/api/admin/_lib/firebaseAdmin";

export type LibraryImagePublishPlatform = "instagram" | "facebook" | "threads" | "pinterest";

export type LibraryImage = {
  jobId: string;
  collection: string;
  imageUrl: string;
  mimeType: string;
  subject: string;
  title: string;
  slug: string;
  pageUrl: string;
  caption: string;
};

export const IMAGE_JOB_ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;

function storageBucket() {
  ensureAdmin();
  const name = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim();
  if (!name) throw new Error("Storage bucket is not configured");
  return getStorage().bucket(name);
}

export async function resolveAssignedDreamSlug(jobId: string) {
  const assigned = await adminDb()
    .collection(DREAM_PAGE_IMAGE_COLLECTION)
    .where("imageJobId", "==", jobId)
    .limit(1)
    .get();
  if (!assigned.empty) {
    const data = assigned.docs[0].data() as { slug?: string };
    const slug = String(data.slug || assigned.docs[0].id);
    if (getDreamEntry(slug)) return slug;
  }
  return "";
}

export async function loadImageJobSlugMap() {
  const snapshot = await adminDb().collection(DREAM_PAGE_IMAGE_COLLECTION).get();
  const map = new Map<string, string>();
  for (const doc of snapshot.docs) {
    const data = doc.data() as { imageJobId?: string; slug?: string };
    const jobId = String(data.imageJobId || "");
    const slug = String(data.slug || doc.id);
    if (jobId && getDreamEntry(slug)) map.set(jobId, slug);
  }
  return map;
}

export function resolveDreamSlug(subject: string, assignedSlug = "") {
  if (assignedSlug && getDreamEntry(assignedSlug)) return assignedSlug;
  return findDreamEntryFromSubject(subject)?.slug || "";
}

export function captionForImage(slug: string, subject: string, maxLen = IMAGE_CAPTION_LIMIT) {
  const entry = slug ? getDreamEntry(slug) : findDreamEntryFromSubject(subject);
  const pageUrl = dreamPageUrl(entry?.slug || slug);
  return {
    slug: entry?.slug || slug,
    title: entry?.name || subject || "Dream meaning",
    pageUrl,
    caption: buildDreamImageCaption(pageUrl, interpretationLead(entry), maxLen),
  };
}

export async function loadLibraryImage(jobId: string, captionMaxLen = IMAGE_CAPTION_LIMIT): Promise<LibraryImage> {
  if (!IMAGE_JOB_ID_PATTERN.test(jobId)) throw new Error("Invalid image id");
  const snapshot = await adminDb().collection(AI_IMAGE_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new Error("Image not found");
  const data = snapshot.data() as {
    status?: string;
    imageUrl?: string;
    mimeType?: string;
    subject?: string;
    prompt?: string;
  };
  const imageUrl = String(data.imageUrl || "");
  if (data.status !== "completed" || !imageUrl) throw new Error("Image is not ready");
  const subject = String(data.subject || data.prompt || "").trim();
  const assignedSlug = await resolveAssignedDreamSlug(jobId);
  const slug = resolveDreamSlug(subject, assignedSlug);
  const built = captionForImage(slug, subject, captionMaxLen);
  return {
    jobId,
    collection: AI_IMAGE_COLLECTION,
    imageUrl,
    mimeType: String(data.mimeType || "image/png"),
    subject,
    title: built.title,
    slug: built.slug,
    pageUrl: built.pageUrl,
    caption: built.caption,
  };
}

export async function markLibraryImagePublished(
  jobId: string,
  platform: LibraryImagePublishPlatform,
  adminUid: string,
  extra: Record<string, string> = {},
) {
  const now = new Date().toISOString();
  const patch: Record<string, string> = {
    [`${platform}PublishedAt`]: now,
    [`${platform}PublishedBy`]: adminUid,
    [`${platform}Status`]: "published",
    [`${platform}Error`]: "",
    ...extra,
  };
  await adminDb().collection(AI_IMAGE_COLLECTION).doc(jobId).set(patch, { merge: true });
  return now;
}

export async function markLibraryImageFailed(jobId: string, platform: LibraryImagePublishPlatform, message: string) {
  await adminDb()
    .collection(AI_IMAGE_COLLECTION)
    .doc(jobId)
    .set(
      {
        [`${platform}Status`]: "failed",
        [`${platform}Error`]: message.slice(0, 300),
      },
      { merge: true },
    )
    .catch(() => undefined);
}

async function uploadPublicJpeg(jobId: string, bytes: Buffer) {
  const token = randomUUID();
  const destination = `admin-ai-images/${jobId}/instagram-feed.jpg`;
  const bucket = storageBucket();
  await bucket.file(destination).save(bytes, {
    resumable: false,
    metadata: {
      contentType: "image/jpeg",
      cacheControl: "public, max-age=3600",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
}

// Instagram feed stills must be JPEG between 4:5 and 1.91:1. Dreamly images
// are 9:16 portraits, so we center-crop to 4:5 and host a public JPEG.
export async function instagramFeedImageUrl(image: LibraryImage) {
  const snapshot = await adminDb().collection(AI_IMAGE_COLLECTION).doc(image.jobId).get();
  const cached = String((snapshot.data() as { instagramFeedImageUrl?: string } | undefined)?.instagramFeedImageUrl || "");
  if (cached) return cached;

  const response = await fetch(image.imageUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to download image for Instagram");
  const input = Buffer.from(await response.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const meta = await sharp(input).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width < 320 || height < 320) throw new Error("Image is too small for Instagram");

  const minRatio = 4 / 5;
  const maxRatio = 1.91;
  const ratio = width / height;
  let pipeline = sharp(input);
  if (ratio < minRatio) {
    const nextHeight = Math.max(1, Math.round(width / minRatio));
    const top = Math.max(0, Math.round((height - nextHeight) / 2));
    pipeline = pipeline.extract({ left: 0, top, width, height: Math.min(nextHeight, height - top) });
  } else if (ratio > maxRatio) {
    const nextWidth = Math.max(1, Math.round(height * maxRatio));
    const left = Math.max(0, Math.round((width - nextWidth) / 2));
    pipeline = pipeline.extract({ left, top: 0, width: Math.min(nextWidth, width - left), height });
  }

  const jpeg = await pipeline.jpeg({ quality: 88 }).toBuffer();
  if (jpeg.byteLength > 8 * 1024 * 1024) throw new Error("Instagram image is larger than 8 MB");
  const url = await uploadPublicJpeg(image.jobId, jpeg);
  await adminDb().collection(AI_IMAGE_COLLECTION).doc(image.jobId).set({ instagramFeedImageUrl: url }, { merge: true });
  return url;
}
