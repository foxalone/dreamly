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
import { occupiedSlotKeys, nextEmptyPublishDay, publishSlotsForDay } from "@/lib/adminAutoSlots";
import { SOCIAL_SCHEDULE_ASSETS_NODE } from "@/lib/socialScheduleQueue";
import { adminDb, adminRtdb } from "./firebaseAdmin";
import { notifyTelegram } from "./telegram";
import { scheduleLibraryImagePublish, scheduleLibraryVideoPublish } from "./socialSchedule";
import { QUEUED_SCHEDULE_PLATFORMS } from "@/lib/adminVideoLibrary";

const FREE_VIDEO_COLLECTION = "adminVideoJobs";

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

export async function listUsedDictionarySlugs() {
  const [reserved, freeVideos, aiVideos, images, pageImages] = await Promise.all([
    loadCollectionDocs(AUTO_USED_SLUGS_COLLECTION),
    loadCollectionDocs(FREE_VIDEO_COLLECTION),
    loadCollectionDocs(AI_VIDEO_COLLECTION),
    loadCollectionDocs(AI_IMAGE_COLLECTION),
    loadCollectionDocs(DREAM_PAGE_IMAGE_COLLECTION),
  ]);

  return collectUsedSlugs({
    slugs: [
      ...reserved.map((doc) => doc.id),
      ...pageImages.map((doc) => String(doc.get("slug") || doc.id)),
      ...freeVideos.map((doc) => String(doc.get("dreamSlug") || "")),
      ...aiVideos.map((doc) => String(doc.get("dreamSlug") || "")),
      ...images.map((doc) => String(doc.get("dreamSlug") || "")),
    ],
    topics: [
      ...freeVideos.map((doc) => String(doc.get("topic") || "")),
      ...aiVideos.map((doc) => String(doc.get("topic") || "")),
    ],
    subjects: images.map((doc) => String(doc.get("subject") || "")),
  });
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
  const { subject, prompt } = resolveImageGenerationPrompt(subjectSource, promptTemplate);
  const config = aiImageConfig(promptTemplate);
  if (!config.paidGenerationEnabled) {
    throw new Error("PAID_IMAGE_DISABLED");
  }
  const estimatedCostUsd = config.prices[imageProvider];
  const budgetDate = utcBudgetDate();
  const reservedRef = db.collection(AUTO_USED_SLUGS_COLLECTION).doc(entry.slug);
  const videoRef = db.collection(FREE_VIDEO_COLLECTION).doc();
  const imageRef = db.collection(AI_IMAGE_COLLECTION).doc();
  const budgetRef = db.collection("adminAiImageBudgets").doc(budgetDate);
  const createdAt = new Date();

  await db.runTransaction(async (transaction) => {
    const [reservedSnapshot, budgetSnapshot] = await Promise.all([
      transaction.get(reservedRef),
      transaction.get(budgetRef),
    ]);
    if (reservedSnapshot.exists) throw new Error("SLUG_ALREADY_RESERVED");
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

    transaction.create(reservedRef, {
      slug: entry.slug,
      topic,
      subject,
      videoJobId: videoRef.id,
      imageJobId: imageRef.id,
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
  await db.collection(DREAM_PAGE_IMAGE_COLLECTION).doc(slug).set({
    slug,
    imageJobId,
    imageUrl,
    subject: String(data.subject || ""),
    assignedBy: AUTO_CONTENT_CREATED_BY,
    assignedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
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
  const [videos, aiVideos, images, queue] = await Promise.all([
    loadCollectionDocs(FREE_VIDEO_COLLECTION),
    loadCollectionDocs(AI_VIDEO_COLLECTION),
    loadCollectionDocs(AI_IMAGE_COLLECTION),
    adminRtdb().ref(SOCIAL_SCHEDULE_ASSETS_NODE).get(),
  ]);
  for (const doc of [...videos, ...aiVideos, ...images]) {
    values.push(String(doc.get("socialScheduledAt") || ""));
    values.push(String(doc.get("youtubeScheduledAt") || ""));
  }
  queue.forEach((child) => {
    const scheduledAt = String(child.val()?.socialSchedule?.scheduledAt || "");
    if (scheduledAt) values.push(scheduledAt);
    return false;
  });
  return values;
}

export async function nextAutoPublishSlots() {
  const day = nextEmptyPublishDay(occupiedSlotKeys(await scheduledAtValues()));
  return { dateKey: day, slots: publishSlotsForDay(day) };
}

export async function scheduleAutoDictionaryPair(input: {
  videoJobId: string;
  imageJobId: string;
  publishAt: string;
  createdBy: string;
}) {
  const video = await scheduleLibraryVideoPublish(
    `free:${input.videoJobId}`,
    [...QUEUED_SCHEDULE_PLATFORMS, "youtube"],
    input.publishAt,
    input.createdBy,
  );
  const image = await scheduleLibraryImagePublish(input.imageJobId, input.publishAt, input.createdBy);
  return { video, image };
}
