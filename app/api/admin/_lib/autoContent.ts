import { saveDreamPageImage } from "@/lib/dreamPageImageStore.mjs";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  AI_IMAGE_ASPECT_RATIO,
  AI_IMAGE_COLLECTION,
  AI_IMAGE_GEMINI_SIZE,
  AI_IMAGE_PROMPT_DOCUMENT,
  AI_IMAGE_QUALITY,
  AI_IMAGE_SIZE,
  isAiImageProvider,
  normalizePromptTemplate,
  resolveImageGenerationPrompt,
  type AiImageProvider,
} from "@/lib/adminAiImage";
import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import {
  AUTO_CONTENT_CREATED_BY,
  AUTO_USED_SLUGS_COLLECTION,
  autoContentPreview,
  collectUsedSlugs,
  imageSubjectForEntry,
  pickUnusedDictionaryEntry,
  videoTopicForEntry,
} from "@/lib/adminAutoDictionary";
import { MAX_SHORT_DURATION_SECONDS } from "@/lib/adminVideo";
import { DREAM_PAGE_IMAGE_COLLECTION, dreamPageImageAlt } from "@/lib/dreamPageImage";
import { getDreamEntry } from "@/lib/dream-dictionary";
import { aiImageConfig, utcBudgetDate } from "../ai-image/_lib";
import {
  AUTO_HORIZON_DAYS,
  AUTO_PAIR_COUNT,
  imagePublishAtForSlot,
  occupiedSlotKeys,
  nextEmptyPublishDays,
  nextFreePublishSlots,
  planOnePerDay,
  publishSlotsForDays,
  startOfTomorrowInJerusalem,
} from "@/lib/adminAutoSlots";
import { SOCIAL_SCHEDULE_ASSETS_NODE } from "@/lib/socialScheduleQueue";
import { adminDb, adminRtdb } from "./firebaseAdmin";
import { notifyTelegram } from "./telegram";
import {
  rescheduleLibraryImagePublish,
  rescheduleLibraryVideoPublish,
  scheduleLibraryImagePublish,
  scheduleLibraryVideoPublish,
} from "./socialSchedule";
import { rescheduleYouTubeVideo } from "@/app/api/admin/youtube/_lib";
import { scheduleAutoYouTube } from "./youtubeRemote";
import { QUEUED_SCHEDULE_PLATFORMS } from "@/lib/adminVideoLibrary";

const FREE_VIDEO_COLLECTION = "adminVideoJobs";
export const WORKER_WAKE_DOCUMENT = "adminSystem/workerWake";

export async function requestLocalWorkerWake(createdBy: string, reason: string) {
  await adminDb().doc(WORKER_WAKE_DOCUMENT).set({
    requestedAt: FieldValue.serverTimestamp(),
    requestedBy: createdBy,
    reason,
  });
}

async function loadCollectionDocs(collection: string) {
  const docs: QueryDocumentSnapshot[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = adminDb().collection(collection).orderBy("__name__").limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    docs.push(...snapshot.docs);
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 200) break;
  }
  return docs;
}

/**
 * A symbol is "used" once it has a video (or an auto reservation). An existing
 * image alone does not count: the pair then generates only the video and reuses
 * that image (see findReusableDreamImage).
 */
export async function listUsedDictionarySlugs() {
  const [reserved, freeVideos, aiVideos] = await Promise.all([
    loadCollectionDocs(AUTO_USED_SLUGS_COLLECTION),
    loadCollectionDocs(FREE_VIDEO_COLLECTION),
    loadCollectionDocs(AI_VIDEO_COLLECTION),
  ]);

  return collectUsedSlugs({
    slugs: [
      ...reserved.map((doc) => doc.id),
      ...freeVideos.map((doc) => String(doc.get("dreamSlug") || "")),
      ...aiVideos.map((doc) => String(doc.get("dreamSlug") || "")),
    ],
    topics: [
      ...freeVideos.map((doc) => String(doc.get("topic") || "")),
      ...aiVideos.map((doc) => String(doc.get("topic") || "")),
    ],
  });
}

type ReusableImage = { imageJobId: string; imageUrl: string; subject: string; source: "page" | "job" };

/** The image already attached to the dream page, else the newest completed AI image generated for that slug. */
export async function findReusableDreamImage(slug: string): Promise<ReusableImage | null> {
  const db = adminDb();
  const completedJob = async (jobId: string) => {
    if (!jobId) return null;
    const snapshot = await db.collection(AI_IMAGE_COLLECTION).doc(jobId).get();
    const data = snapshot.data() as { status?: string; imageUrl?: string; subject?: string } | undefined;
    if (!snapshot.exists || data?.status !== "completed" || !String(data.imageUrl || "").trim()) return null;
    return { imageJobId: jobId, imageUrl: String(data.imageUrl), subject: String(data.subject || "") };
  };

  const page = (await db.collection(DREAM_PAGE_IMAGE_COLLECTION).doc(slug).get()).data() as
    | { imageJobId?: string }
    | undefined;
  const fromPage = await completedJob(String(page?.imageJobId || "").trim());
  if (fromPage) return { ...fromPage, source: "page" };

  const jobs = await db.collection(AI_IMAGE_COLLECTION).where("dreamSlug", "==", slug).get();
  const completed = jobs.docs
    .filter((doc) => doc.get("status") === "completed" && String(doc.get("imageUrl") || "").trim())
    .sort((left, right) => {
      const l = left.get("createdAt")?.toMillis?.() ?? 0;
      const r = right.get("createdAt")?.toMillis?.() ?? 0;
      return r - l;
    });
  const newest = completed[0];
  if (!newest) return null;
  return {
    imageJobId: newest.id,
    imageUrl: String(newest.get("imageUrl")),
    subject: String(newest.get("subject") || ""),
    source: "job",
  };
}

export async function previewAutoDictionaryContent() {
  const used = await listUsedDictionarySlugs();
  const entry = pickUnusedDictionaryEntry(used);
  return {
    ...autoContentPreview(entry),
    usedCount: used.size,
  };
}

export async function enqueueAutoDictionaryContent(options: {
  createdBy: string;
  sendToTelegram?: boolean;
  imageProvider?: AiImageProvider;
}) {
  const sendToTelegram = options.sendToTelegram !== false;
  const imageProvider: AiImageProvider = options.imageProvider === "sora" ? "sora" : "veo";
  const db = adminDb();
  const used = await listUsedDictionarySlugs();
  const entry = pickUnusedDictionaryEntry(used);
  const topic = videoTopicForEntry(entry);
  const subjectSource = imageSubjectForEntry(entry);
  const promptSnapshot = await db.doc(AI_IMAGE_PROMPT_DOCUMENT).get();
  const promptTemplate = normalizePromptTemplate(promptSnapshot.data()?.template);
  const { subject: generatedSubject, prompt } = resolveImageGenerationPrompt(subjectSource, promptTemplate);
  const config = aiImageConfig(promptTemplate);
  // A page that already has an image keeps it: only the video is generated and
  // the existing image is what gets published.
  const reusable = await findReusableDreamImage(entry.slug);
  if (!reusable && !config.paidGenerationEnabled) {
    throw new Error("PAID_IMAGE_DISABLED");
  }
  const subject = reusable?.subject || generatedSubject;
  const estimatedCostUsd = reusable ? 0 : config.prices[imageProvider];
  const budgetDate = utcBudgetDate();
  const reservedRef = db.collection(AUTO_USED_SLUGS_COLLECTION).doc(entry.slug);
  const videoRef = db.collection(FREE_VIDEO_COLLECTION).doc();
  const imageRef = reusable ? db.collection(AI_IMAGE_COLLECTION).doc(reusable.imageJobId) : db.collection(AI_IMAGE_COLLECTION).doc();
  const budgetRef = db.collection("adminAiImageBudgets").doc(budgetDate);
  const createdAt = new Date();

  await db.runTransaction(async (transaction) => {
    const [reservedSnapshot, budgetSnapshot] = await Promise.all([
      transaction.get(reservedRef),
      transaction.get(budgetRef),
    ]);
    if (reservedSnapshot.exists) throw new Error("SLUG_ALREADY_RESERVED");
    if (!reusable) {
      const budget = budgetSnapshot.data() as { reservedUsd?: number; jobsCount?: number } | undefined;
      const reservedUsd = Number(budget?.reservedUsd ?? 0);
      const jobsCount = Number(budget?.jobsCount ?? 0);
      if (jobsCount >= config.maxJobsPerDay) throw new Error("DAILY_JOB_LIMIT");
      if (reservedUsd + estimatedCostUsd > config.dailyBudgetUsd + 0.000001) throw new Error("DAILY_BUDGET_LIMIT");

      transaction.set(budgetRef, {
        date: budgetDate,
        reservedUsd: reservedUsd + estimatedCostUsd,
        jobsCount: jobsCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    transaction.create(reservedRef, {
      slug: entry.slug,
      topic,
      subject,
      videoJobId: videoRef.id,
      imageJobId: imageRef.id,
      imageReused: Boolean(reusable),
      imageReusedFrom: reusable?.source || "",
      status: "queued",
      createdBy: options.createdBy || AUTO_CONTENT_CREATED_BY,
      createdAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });

    transaction.create(videoRef, {
      mode: "mixed",
      topic,
      dreamSlug: entry.slug,
      language: "en-US",
      status: "queued",
      stage: "queued",
      maxDurationSeconds: MAX_SHORT_DURATION_SECONDS,
      sendToTelegram,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
      createdBy: options.createdBy || AUTO_CONTENT_CREATED_BY,
      tokenUsage: null,
      youtubeMetadata: null,
      videoUrl: "",
      telegramMessageId: null,
      telegramError: "",
      error: "",
    });

    if (reusable) return;
    transaction.create(imageRef, {
      subject,
      prompt,
      provider: imageProvider,
      dreamSlug: entry.slug,
      assignToDreamPage: true,
      language: "en-US",
      status: "queued",
      stage: "queued",
      progress: 0,
      sendToTelegram,
      costConfirmed: true,
      estimatedCostUsd,
      actualCostUsd: null,
      budgetDate,
      budgetReservationStatus: "reserved",
      tokenUsage: null,
      providerUsage: {
        model: imageProvider === "veo" ? config.veoModel : config.soraModel,
        size: imageProvider === "veo" ? AI_IMAGE_GEMINI_SIZE : AI_IMAGE_SIZE,
        quality: AI_IMAGE_QUALITY,
        aspectRatio: AI_IMAGE_ASPECT_RATIO,
      },
      imageUrl: "",
      imageStoragePath: "",
      mimeType: "",
      telegramMessageId: null,
      telegramError: "",
      telegramStatus: sendToTelegram ? "pending" : "disabled",
      error: "",
      retryCount: 0,
      retryTelegramOnly: false,
      createdBy: options.createdBy || AUTO_CONTENT_CREATED_BY,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
    });
  });

  return {
    entry: autoContentPreview(entry),
    videoJobId: videoRef.id,
    imageJobId: imageRef.id,
    imageReused: Boolean(reusable),
    createdAt: createdAt.toISOString(),
  };
}

export async function assignAutoImageToDreamPage(imageJobId: string) {
  const db = adminDb();
  const snapshot = await db.collection(AI_IMAGE_COLLECTION).doc(imageJobId).get();
  const data = snapshot.data() as {
    status?: string;
    imageUrl?: string;
    subject?: string;
    dreamSlug?: string;
    assignToDreamPage?: boolean;
  } | undefined;
  const slug = String(data?.dreamSlug || "").trim();
  const imageUrl = String(data?.imageUrl || "").trim();
  if (!snapshot.exists || data?.status !== "completed" || !slug || !imageUrl) return null;
  if (data.assignToDreamPage === false) return null;
  const entry = getDreamEntry(slug);
  await saveDreamPageImage(db, slug, {
    slug,
    imageJobId,
    imageUrl,
    subject: String(data.subject || ""),
    assignedBy: AUTO_CONTENT_CREATED_BY,
  }, FieldValue.serverTimestamp());
  return {
    slug,
    imageJobId,
    imageUrl,
    alt: dreamPageImageAlt(entry?.name || String(data.subject || "")),
  };
}

type JobState = { status: string; error: string; url: string };

async function readJobState(collection: string, id: string): Promise<JobState> {
  const snapshot = await adminDb().collection(collection).doc(id).get();
  const data = snapshot.data() as { status?: string; error?: string; videoUrl?: string; imageUrl?: string } | undefined;
  return {
    status: String(data?.status || "missing"),
    error: String(data?.error || ""),
    url: String(data?.videoUrl || data?.imageUrl || ""),
  };
}

export async function waitForAutoDictionaryContent(input: {
  slug: string;
  videoJobId: string;
  imageJobId: string;
  timeoutMs?: number;
}) {
  const timeoutMs = input.timeoutMs ?? 50 * 60_000;
  const started = Date.now();
  let video = await readJobState(FREE_VIDEO_COLLECTION, input.videoJobId);
  let image = await readJobState(AI_IMAGE_COLLECTION, input.imageJobId);

  while (Date.now() - started < timeoutMs) {
    video = await readJobState(FREE_VIDEO_COLLECTION, input.videoJobId);
    image = await readJobState(AI_IMAGE_COLLECTION, input.imageJobId);
    const videoDone = video.status === "completed" || video.status === "failed";
    const imageDone = image.status === "completed" || image.status === "failed";
    if (videoDone && imageDone) break;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  if (image.status === "completed") {
    await assignAutoImageToDreamPage(input.imageJobId);
  }

  const ok = video.status === "completed" && image.status === "completed";
  await adminDb().collection(AUTO_USED_SLUGS_COLLECTION).doc(input.slug).set({
    status: ok ? "completed" : video.status === "failed" || image.status === "failed" ? "failed" : "processing",
    completedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return { ok, video, image };
}

export async function notifyAutoDictionaryContentDone(input: {
  title: string;
  slug: string;
  video: JobState;
  image: JobState;
  scheduledAt?: string;
}) {
  const page = `https://dreamly.art/dreams/${input.slug}`;
  const videoLine = input.video.status === "completed" ? "видео готово" : `видео: ${input.video.status}${input.video.error ? ` (${input.video.error})` : ""}`;
  const imageLine = input.image.status === "completed" ? "картинка готова" : `картинка: ${input.image.status}${input.image.error ? ` (${input.image.error})` : ""}`;
  const scheduleLine = input.scheduledAt ? `слот: ${input.scheduledAt}` : "";
  if (input.title.includes("Dreamly авто")) {
    return notifyTelegram(input.title);
  }
  return notifyTelegram(["Dreamly авто готово", input.title, page, videoLine, imageLine, scheduleLine].filter(Boolean).join("\n"));
}

async function scheduledAtValues() {
  const values: string[] = [];
  // Only videos occupy the daily video slot: auto-pair images are queued at
  // AUTO_IMAGE_HOUR and would otherwise mark the whole day as taken.
  const [videos, aiVideos, queue] = await Promise.all([
    loadCollectionDocs(FREE_VIDEO_COLLECTION),
    loadCollectionDocs(AI_VIDEO_COLLECTION),
    adminRtdb().ref(SOCIAL_SCHEDULE_ASSETS_NODE).get(),
  ]);
  for (const doc of [...videos, ...aiVideos]) {
    values.push(String(doc.get("socialScheduledAt") || ""));
    values.push(String(doc.get("youtubeScheduledAt") || ""));
  }
  queue.forEach((child) => {
    const node = child.val() as { libraryId?: string; socialSchedule?: { scheduledAt?: string } } | null;
    if (String(node?.libraryId || child.key || "").startsWith("image")) return false;
    const scheduledAt = String(node?.socialSchedule?.scheduledAt || "");
    if (scheduledAt) values.push(scheduledAt);
    return false;
  });
  return values;
}

export async function nextAutoPublishSlots() {
  const dateKeys = nextEmptyPublishDays(occupiedSlotKeys(await scheduledAtValues()), AUTO_HORIZON_DAYS);
  return { dateKey: dateKeys[0], dateKeys, slots: publishSlotsForDays(dateKeys), pairCount: AUTO_PAIR_COUNT };
}

export async function enqueueAutoDictionaryBatch(options: {
  createdBy: string;
  sendToTelegram?: boolean;
  imageProvider?: AiImageProvider;
  count?: number;
  /** Take the earliest free slots (holes in partially booked days first) instead of whole empty days. */
  fillGaps?: boolean;
}) {
  // Refilling holes may need several days' worth of pairs; a normal catch-up is one night.
  const count = Math.min(Math.max(options.count ?? AUTO_PAIR_COUNT, 1), options.fillGaps ? 7 : AUTO_PAIR_COUNT);
  const slots = options.fillGaps
    ? await (async () => {
        const free = nextFreePublishSlots(occupiedSlotKeys(await scheduledAtValues()), count);
        return { dateKey: free[0]?.dateKey, dateKeys: [...new Set(free.map((slot) => slot.dateKey))], slots: free, pairCount: count };
      })()
    : await nextAutoPublishSlots();
  const pairs = [];
  for (let index = 0; index < count; index += 1) {
    const queued = await enqueueAutoDictionaryContent(options);
    const slot = slots.slots[index];
    pairs.push({
      slug: queued.entry.slug,
      title: queued.entry.topic,
      topic: queued.entry.topic,
      pagePath: queued.entry.pagePath,
      videoJobId: queued.videoJobId,
      imageJobId: queued.imageJobId,
      publishAt: slot?.publishAt || "",
      dateKey: slot?.dateKey || "",
      hour: slot?.hour ?? null,
    });
  }
  return { slots, pairs };
}

export type AutoPairImageBackfillItem = {
  slug: string;
  imageJobId: string;
  videoPublishAt: string;
  imagePublishAt: string;
  outcome: "booked" | "already" | "missed" | "error";
  error: string;
};

/**
 * Pairs booked before 2026-09-23 (commit 574723d) got a video slot but no image
 * booking. Walk every reservation whose video is scheduled or already published
 * and queue its image at 19:00 ET on the video day, unless that moment has passed.
 * Idempotent: an image that is already queued or published is reported as "already".
 */
export async function backfillAutoPairImages(createdBy: string) {
  const db = adminDb();
  const now = Date.now();
  const items: AutoPairImageBackfillItem[] = [];
  const reservations = await loadCollectionDocs(AUTO_USED_SLUGS_COLLECTION);
  for (const reservation of reservations) {
    const imageJobId = String(reservation.get("imageJobId") || "").trim();
    const videoJobId = String(reservation.get("videoJobId") || "").trim();
    if (!imageJobId || !videoJobId) continue;
    const video = await db.collection(FREE_VIDEO_COLLECTION).doc(videoJobId).get();
    if (!video.exists) continue;
    // Pending publishes keep socialScheduledAt; finished ones only the moment they went out.
    const videoPublishAt = String(video.get("socialScheduledAt") || "").trim()
      || (String(video.get("socialScheduleStatus") || "") === "done" ? String(video.get("socialScheduleFinishedAt") || "").trim() : "");
    if (!videoPublishAt) continue;
    const imagePublishAt = imagePublishAtForSlot(videoPublishAt);
    const base = { slug: reservation.id, imageJobId, videoPublishAt, imagePublishAt, error: "" };
    if (!imagePublishAt) {
      items.push({ ...base, outcome: "error", error: "Bad publishAt" });
      continue;
    }
    try {
      const image = await db.collection(AI_IMAGE_COLLECTION).doc(imageJobId).get();
      if (!image.exists) {
        items.push({ ...base, outcome: "error", error: "Image not found" });
        continue;
      }
      if (String(image.get("socialScheduledAt") || "") || String(image.get("socialScheduleStatus") || "") === "done") {
        items.push({ ...base, outcome: "already" });
        continue;
      }
      if (Date.parse(imagePublishAt) <= now) {
        items.push({ ...base, outcome: "missed" });
        continue;
      }
      await scheduleLibraryImagePublish(imageJobId, imagePublishAt, createdBy);
      items.push({ ...base, outcome: "booked" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image schedule error";
      console.error("[auto-content] image backfill", reservation.id, message);
      items.push({ ...base, outcome: "error", error: message });
    }
  }
  const count = (outcome: AutoPairImageBackfillItem["outcome"]) => items.filter((item) => item.outcome === outcome).length;
  return {
    booked: count("booked"),
    already: count("already"),
    missed: count("missed"),
    errors: count("error"),
    items,
  };
}

export async function readAutoPairState(videoJobId: string, imageJobId: string) {
  const [video, image] = await Promise.all([
    readJobState(FREE_VIDEO_COLLECTION, videoJobId),
    readJobState(AI_IMAGE_COLLECTION, imageJobId),
  ]);
  return { video, image };
}

export async function scheduleReadyAutoDictionaryPair(input: {
  slug: string;
  videoJobId: string;
  imageJobId: string;
  publishAt: string;
  createdBy: string;
}) {
  const { video, image } = await readAutoPairState(input.videoJobId, input.imageJobId);
  if (video.status === "failed" || image.status === "failed") {
    await adminDb().collection(AUTO_USED_SLUGS_COLLECTION).doc(input.slug).set({
      status: "failed",
      completedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    throw new Error(video.error || image.error || "AUTO_PAIR_FAILED");
  }
  if (video.status !== "completed" || image.status !== "completed") {
    throw new Error("AUTO_PAIR_NOT_READY");
  }

  const videoSnap = await adminDb().collection(FREE_VIDEO_COLLECTION).doc(input.videoJobId).get();
  if (String(videoSnap.get("socialScheduledAt") || "")) {
    // The video made it earlier; still queue the image (idempotent) so a retried pair gets both.
    const imageBooking = await scheduleAutoPairImage(input.imageJobId, input.publishAt, input.createdBy);
    return {
      alreadyScheduled: true,
      youtubeScheduled: String(videoSnap.get("youtubeStatus") || "") === "scheduled",
      youtubeError: String(videoSnap.get("youtubeError") || ""),
      ...imageBooking,
      video,
      image,
    };
  }

  await assignAutoImageToDreamPage(input.imageJobId);
  await adminDb().collection(AUTO_USED_SLUGS_COLLECTION).doc(input.slug).set({
    status: "completed",
    completedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  const booked = await scheduleAutoDictionaryPair(input);
  return { alreadyScheduled: false, ...booked, video, image };
}

/**
 * Queue the pair's image for Instagram/Facebook/Threads the same day at 19:00 ET (see imagePublishAtForSlot).
 * Never throws — a missing or failed image must not undo the video booking.
 */
async function scheduleAutoPairImage(imageJobId: string, videoPublishAt: string, createdBy: string) {
  const imagePublishAt = imagePublishAtForSlot(videoPublishAt);
  if (!imagePublishAt) return { imageScheduled: false, imagePublishAt: "", imageError: "Bad publishAt" };
  try {
    const snapshot = await adminDb().collection(AI_IMAGE_COLLECTION).doc(imageJobId).get();
    const scheduledAt = String(snapshot.get("socialScheduledAt") || "");
    if (scheduledAt) return { imageScheduled: true, imagePublishAt: scheduledAt, imageError: "" };
    if (String(snapshot.get("socialScheduleStatus") || "") === "done") {
      return { imageScheduled: true, imagePublishAt: "", imageError: "" };
    }
    await scheduleLibraryImagePublish(imageJobId, imagePublishAt, createdBy);
    return { imageScheduled: true, imagePublishAt, imageError: "" };
  } catch (error) {
    const imageError = error instanceof Error ? error.message : "Image schedule error";
    console.error("[auto-content] image schedule", imageJobId, imageError);
    return { imageScheduled: false, imagePublishAt, imageError };
  }
}

export async function scheduleAutoDictionaryPair(input: {
  videoJobId: string;
  imageJobId: string;
  publishAt: string;
  createdBy: string;
}) {
  const video = await scheduleLibraryVideoPublish(
    `free:${input.videoJobId}`,
    [...QUEUED_SCHEDULE_PLATFORMS],
    input.publishAt,
    input.createdBy,
  );
  const imageBooking = await scheduleAutoPairImage(input.imageJobId, input.publishAt, input.createdBy);
  try {
    await scheduleAutoYouTube(`free:${input.videoJobId}`, input.publishAt, input.createdBy);
    return { video, youtubeScheduled: true, youtubeError: "", ...imageBooking };
  } catch (error) {
    const youtubeError = error instanceof Error ? error.message : "YouTube error";
    return { video, youtubeScheduled: false, youtubeError, ...imageBooking };
  }
}

export type RespaceVideoResult = {
  libraryId: string;
  slug: string;
  title: string;
  from: string;
  to: string;
  social: "moved" | "same" | "kept" | "error";
  youtube: "moved" | "same" | "booked" | "none" | "later" | "error";
  image: "moved" | "same" | "booked" | "kept" | "none" | "error";
  imageAt: string;
  errors: string[];
};

/**
 * dima's rule since 2026-09-29: one video and one image a day, 12:00 / 19:00 ET.
 * Every video still pending in the social queue from tomorrow (Jerusalem) on is
 * re-timed to consecutive days in its current order: the queue entry, the YouTube
 * publishAt (or a fresh YouTube booking where none went up) and the paired image.
 * Idempotent — run it again after reconnecting YouTube or after a timeout.
 */
export async function respaceBookedPublishes(options: { createdBy: string; dryRun?: boolean; deadlineMs?: number }) {
  const cutoff = startOfTomorrowInJerusalem();
  const deadlineMs = options.deadlineMs ?? Date.now() + 240_000;
  const db = adminDb();
  const [videos, aiVideos, reservations] = await Promise.all([
    loadCollectionDocs(FREE_VIDEO_COLLECTION),
    loadCollectionDocs(AI_VIDEO_COLLECTION),
    loadCollectionDocs(AUTO_USED_SLUGS_COLLECTION),
  ]);
  const imageByVideo = new Map<string, { imageJobId: string; slug: string }>();
  for (const reservation of reservations) {
    const videoJobId = String(reservation.get("videoJobId") || "").trim();
    const imageJobId = String(reservation.get("imageJobId") || "").trim();
    if (videoJobId && imageJobId) imageByVideo.set(videoJobId, { imageJobId, slug: reservation.id });
  }
  const candidates = [
    ...videos.map((doc) => ({ doc, libraryId: `free:${doc.id}` })),
    ...aiVideos.map((doc) => ({ doc, libraryId: `ai:${doc.id}` })),
  ].filter(({ doc }) => {
    const at = Date.parse(String(doc.get("socialScheduledAt") || ""));
    return String(doc.get("socialScheduleStatus") || "") === "pending" && Number.isFinite(at) && at >= cutoff.getTime();
  });
  const byId = new Map(candidates.map((item) => [item.libraryId, item]));
  const plan = planOnePerDay(
    candidates.map(({ doc, libraryId }) => ({ id: libraryId, at: String(doc.get("socialScheduledAt")) })),
    cutoff,
  );

  const results: RespaceVideoResult[] = [];
  const pairedImages = new Set<string>();
  for (const move of plan) {
    const { doc } = byId.get(move.id)!;
    const pair = move.id.startsWith("free:") ? imageByVideo.get(doc.id) : undefined;
    if (pair) pairedImages.add(pair.imageJobId);
    const result: RespaceVideoResult = {
      libraryId: move.id,
      slug: pair?.slug || String(doc.get("dreamSlug") || ""),
      title: String(doc.get("youtubeMetadata")?.title || doc.get("topic") || ""),
      from: move.at,
      to: move.publishAt,
      social: move.changed ? "moved" : "same",
      youtube: "none",
      image: pair ? "moved" : "none",
      imageAt: pair ? move.imagePublishAt : "",
      errors: [],
    };
    const youtubeStatus = String(doc.get("youtubeStatus") || "");
    const youtubeAt = String(doc.get("youtubeScheduledAt") || "");
    const youtubePublished = Boolean(doc.get("youtubePublishedAt")) || youtubeStatus === "published";
    if (youtubeStatus === "scheduled") {
      result.youtube = Date.parse(youtubeAt) === Date.parse(move.publishAt) ? "same" : "moved";
    } else if (!youtubePublished && youtubeStatus !== "uploading" && youtubeStatus !== "publishing") {
      result.youtube = "booked";
    }

    if (options.dryRun) {
      results.push(result);
      continue;
    }

    if (move.changed) {
      try {
        const moved = await rescheduleLibraryVideoPublish(move.id, move.publishAt);
        if (!moved.moved) result.social = "kept";
      } catch (error) {
        result.social = "error";
        result.errors.push(`соцсети: ${error instanceof Error ? error.message : "ошибка"}`);
      }
    }

    if (result.youtube === "moved") {
      try {
        await rescheduleYouTubeVideo(move.id, move.publishAt);
      } catch (error) {
        result.youtube = "error";
        result.errors.push(`YouTube: ${error instanceof Error ? error.message : "ошибка"}`);
      }
    } else if (result.youtube === "booked") {
      // A fresh upload is slow; leave the rest for the next run rather than time out mid-upload.
      if (Date.now() > deadlineMs - 60_000) {
        result.youtube = "later";
      } else {
        try {
          await scheduleAutoYouTube(move.id, move.publishAt, options.createdBy);
        } catch (error) {
          result.youtube = "error";
          result.errors.push(`YouTube: ${error instanceof Error ? error.message : "ошибка"}`);
        }
      }
    }

    if (pair) {
      try {
        const image = await db.collection(AI_IMAGE_COLLECTION).doc(pair.imageJobId).get();
        const sameTime = Date.parse(String(image.get("socialScheduledAt") || "")) === Date.parse(move.imagePublishAt);
        if (!image.exists || image.get("status") !== "completed") result.image = "none";
        else if (sameTime && String(image.get("socialScheduleStatus") || "") === "pending") result.image = "same";
        else result.image = await rescheduleLibraryImagePublish(pair.imageJobId, move.imagePublishAt, options.createdBy);
      } catch (error) {
        result.image = "error";
        result.errors.push(`картинка: ${error instanceof Error ? error.message : "ошибка"}`);
      }
    }
    results.push(result);
  }

  // Images booked from tomorrow on that belong to none of the moved videos: reported, never touched.
  const queue = await adminRtdb().ref(SOCIAL_SCHEDULE_ASSETS_NODE).get();
  const strayImages: Array<{ libraryId: string; title: string; scheduledAt: string }> = [];
  queue.forEach((child) => {
    const node = child.val() as { libraryId?: string; title?: string; socialSchedule?: { scheduledAt?: string; status?: string } } | null;
    const libraryId = String(node?.libraryId || "");
    const scheduledAt = String(node?.socialSchedule?.scheduledAt || "");
    if (!libraryId.startsWith("image:") || node?.socialSchedule?.status !== "pending") return false;
    if (Date.parse(scheduledAt) < cutoff.getTime() || pairedImages.has(libraryId.slice("image:".length))) return false;
    strayImages.push({ libraryId, title: String(node?.title || ""), scheduledAt });
    return false;
  });

  return {
    dryRun: Boolean(options.dryRun),
    cutoff: cutoff.toISOString(),
    count: results.length,
    lastDay: plan.at(-1)?.dateKey || "",
    errors: results.filter((item) => item.errors.length).length,
    youtubeLater: results.filter((item) => item.youtube === "later").length,
    moves: results,
    strayImages,
  };
}
