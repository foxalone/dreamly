import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  AI_VIDEO_COLLECTION,
  AI_VIDEO_MAX_DURATION_SECONDS,
  AI_VIDEO_MODES,
  AI_VIDEO_SIZE,
  AI_VIDEO_WORKER_DOCUMENT,
  isAiVideoMode,
} from "@/lib/adminAiVideo";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { aiVideoConfig, serializeAiVideoJob, utcBudgetDate } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  if (status === 500) console.error("[admin/ai-video]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to access AI video jobs" : message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const budgetDate = utcBudgetDate();
    const [jobsSnapshot, workerSnapshot, budgetSnapshot] = await Promise.all([
      db.collection(AI_VIDEO_COLLECTION).orderBy("createdAt", "desc").limit(30).get(),
      db.doc(AI_VIDEO_WORKER_DOCUMENT).get(),
      db.collection("adminAiVideoBudgets").doc(budgetDate).get(),
    ]);
    const jobs = jobsSnapshot.docs.map(serializeAiVideoJob).filter((job): job is NonNullable<typeof job> => job !== null);
    const worker = workerSnapshot.data() as
      | { lastSeenAt?: { toDate?: () => Date }; host?: string; state?: string; currentJobId?: string }
      | undefined;
    const lastSeenAt = worker?.lastSeenAt?.toDate?.()?.toISOString() ?? null;
    const budget = budgetSnapshot.data() as { reservedUsd?: number; jobsCount?: number } | undefined;
    return NextResponse.json({
      jobs,
      config: aiVideoConfig(),
      budget: {
        date: budgetDate,
        reservedUsd: Number(budget?.reservedUsd ?? 0),
        jobsCount: Number(budget?.jobsCount ?? 0),
      },
      worker: {
        online: Boolean(lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 75_000),
        lastSeenAt,
        host: worker?.host ?? "",
        state: worker?.state ?? "offline",
        currentJobId: worker?.currentJobId ?? "",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const topic = typeof payload.topic === "string" ? payload.topic.trim() : "";
    if (topic.length < 5 || topic.length > 500) {
      return NextResponse.json({ error: "Topic must contain 5–500 characters" }, { status: 400 });
    }
    if (!isAiVideoMode(payload.mode)) {
      return NextResponse.json({ error: "Mode must be preview or standard" }, { status: 400 });
    }
    if (payload.costConfirmed !== true) {
      return NextResponse.json({ error: "Paid generation must be explicitly confirmed" }, { status: 400 });
    }

    const config = aiVideoConfig();
    if (!config.paidGenerationEnabled) {
      return NextResponse.json(
        { error: "Paid Sora generation is disabled on the server (AI_VIDEO_PAID_GENERATION_ENABLED=false)" },
        { status: 403 },
      );
    }

    const mode = payload.mode;
    const modeConfig = AI_VIDEO_MODES[mode];
    const estimatedCostUsd = config.prices[mode];
    const budgetDate = utcBudgetDate();
    const db = adminDb();
    const jobRef = db.collection(AI_VIDEO_COLLECTION).doc();
    const budgetRef = db.collection("adminAiVideoBudgets").doc(budgetDate);
    const sceneStates = Array.from({ length: modeConfig.sceneCount }, (_, index) => ({
      index,
      status: "pending",
      taskId: null,
      progress: 0,
      error: "",
      safePromptRetryCount: 0,
    }));

    await db.runTransaction(async (transaction) => {
      const budgetSnapshot = await transaction.get(budgetRef);
      const budget = budgetSnapshot.data() as { reservedUsd?: number; jobsCount?: number } | undefined;
      const reservedUsd = Number(budget?.reservedUsd ?? 0);
      const jobsCount = Number(budget?.jobsCount ?? 0);
      if (jobsCount >= config.maxJobsPerDay) throw new Error("DAILY_JOB_LIMIT");
      if (reservedUsd + estimatedCostUsd > config.dailyBudgetUsd + 0.000001) throw new Error("DAILY_BUDGET_LIMIT");

      transaction.set(
        budgetRef,
        {
          date: budgetDate,
          reservedUsd: reservedUsd + estimatedCostUsd,
          jobsCount: jobsCount + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.create(jobRef, {
        topic,
        mode,
        language: "en-US",
        status: "queued",
        stage: "queued",
        progress: 0,
        sceneCount: modeConfig.sceneCount,
        sceneSeconds: modeConfig.sceneSeconds,
        maxDurationSeconds: AI_VIDEO_MAX_DURATION_SECONDS,
        sendToTelegram: payload.sendToTelegram !== false,
        costConfirmed: true,
        estimatedCostUsd,
        budgetDate,
        budgetReservationStatus: "reserved",
        script: "",
        scenePrompts: [],
        providerTaskIds: Array(modeConfig.sceneCount).fill(null),
        sceneStates,
        tokenUsage: null,
        providerUsage: {
          model: config.model,
          size: AI_VIDEO_SIZE,
          requestedSeconds: 0,
          generatedSeconds: 0,
        },
        youtubeMetadata: null,
        videoUrl: "",
        thumbnailUrl: "",
        videoStoragePath: "",
        thumbnailStoragePath: "",
        telegramMessageId: null,
        telegramError: "",
        telegramStatus: payload.sendToTelegram === false ? "disabled" : "pending",
        error: "",
        failedSceneIndex: null,
        retryCount: 0,
        retryTelegramOnly: false,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
      });
    });

    const snapshot = await jobRef.get();
    return NextResponse.json({ job: serializeAiVideoJob(snapshot) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "DAILY_JOB_LIMIT") {
      return NextResponse.json({ error: "Daily AI video job limit reached" }, { status: 429 });
    }
    if (message === "DAILY_BUDGET_LIMIT") {
      return NextResponse.json({ error: "Daily AI video budget would be exceeded" }, { status: 429 });
    }
    return apiError(error);
  }
}
