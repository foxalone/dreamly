import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  MAX_SHORT_DURATION_SECONDS,
  type AdminVideoJob,
  type AdminVideoTokenUsage,
  type AdminVideoYouTubeMetadata,
} from "@/lib/adminVideo";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

type StoredVideoJob = {
  topic?: string;
  language?: "en-US";
  status?: AdminVideoJob["status"];
  stage?: string;
  maxDurationSeconds?: number;
  sendToTelegram?: boolean;
  createdAt?: { toDate?: () => Date };
  startedAt?: { toDate?: () => Date };
  completedAt?: { toDate?: () => Date };
  createdBy?: string;
  tokenUsage?: AdminVideoTokenUsage;
  youtubeMetadata?: AdminVideoYouTubeMetadata;
  videoUrl?: string;
  telegramMessageId?: number;
  telegramError?: string;
  error?: string;
};

function iso(value: StoredVideoJob["createdAt"]) {
  return value?.toDate?.()?.toISOString() ?? null;
}

function serializeJob(snapshot: DocumentSnapshot): AdminVideoJob | null {
  const data = snapshot.data() as StoredVideoJob | undefined;
  if (!data) return null;
  return {
    id: snapshot.id,
    topic: data.topic ?? "",
    language: "en-US",
    status: data.status ?? "queued",
    stage: data.stage ?? "queued",
    maxDurationSeconds: data.maxDurationSeconds ?? MAX_SHORT_DURATION_SECONDS,
    sendToTelegram: Boolean(data.sendToTelegram),
    createdAt: iso(data.createdAt) ?? new Date().toISOString(),
    startedAt: iso(data.startedAt),
    completedAt: iso(data.completedAt),
    createdBy: data.createdBy ?? "",
    tokenUsage: data.tokenUsage ?? null,
    youtubeMetadata: data.youtubeMetadata ?? null,
    videoUrl: data.videoUrl ?? "",
    telegramMessageId: data.telegramMessageId ?? null,
    telegramError: data.telegramError ?? "",
    error: data.error ?? "",
  };
}

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  if (status === 500) console.error("[admin/videos]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to access video jobs" : message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const [snapshot, workerSnapshot] = await Promise.all([
      db.collection("adminVideoJobs").orderBy("createdAt", "desc").limit(25).get(),
      db.collection("adminSystem").doc("videoWorker").get(),
    ]);
    const jobs = snapshot.docs
      .map(serializeJob)
      .filter((job): job is AdminVideoJob => job !== null);
    const workerData = workerSnapshot.data() as
      | { lastSeenAt?: { toDate?: () => Date }; host?: string }
      | undefined;
    const lastSeenAt = iso(workerData?.lastSeenAt);
    const online = Boolean(lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 60_000);
    return NextResponse.json({
      jobs,
      worker: { online, lastSeenAt, host: workerData?.host ?? "" },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json()) as { topic?: unknown; sendToTelegram?: unknown };
    const topic = typeof payload.topic === "string" ? payload.topic.trim().slice(0, 300) : "";
    if (topic.length < 5) {
      return NextResponse.json({ error: "Enter a video topic" }, { status: 400 });
    }
    const sendToTelegram = payload.sendToTelegram !== false;
    const createdAt = new Date();
    const reference = await adminDb().collection("adminVideoJobs").add({
      topic,
      language: "en-US",
      status: "queued",
      stage: "queued",
      maxDurationSeconds: MAX_SHORT_DURATION_SECONDS,
      sendToTelegram,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
      createdBy: uid,
      tokenUsage: null,
      youtubeMetadata: null,
      videoUrl: "",
      telegramMessageId: null,
      telegramError: "",
      error: "",
    });
    const job: AdminVideoJob = {
      id: reference.id,
      topic,
      language: "en-US",
      status: "queued",
      stage: "queued",
      maxDurationSeconds: MAX_SHORT_DURATION_SECONDS,
      sendToTelegram,
      createdAt: createdAt.toISOString(),
      startedAt: null,
      completedAt: null,
      createdBy: uid,
      tokenUsage: null,
      youtubeMetadata: null,
      videoUrl: "",
      telegramMessageId: null,
      telegramError: "",
      error: "",
    };
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
