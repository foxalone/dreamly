import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  AI_IMAGE_ASPECT_RATIO,
  AI_IMAGE_COLLECTION,
  AI_IMAGE_GEMINI_SIZE,
  AI_IMAGE_GOTHIC_PROMPT_TEMPLATE,
  AI_IMAGE_QUALITY,
  AI_IMAGE_SIZE,
  AI_IMAGE_PROMPT_DOCUMENT,
  AI_IMAGE_SUBJECT_MAX_LENGTH,
  AI_IMAGE_TEMPLATE_MAX_LENGTH,
  AI_IMAGE_WORKER_DOCUMENT,
  isAiImageProvider,
  normalizePromptTemplate,
  resolveImageGenerationPrompt,
} from "@/lib/adminAiImage";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { aiImageConfig, serializeAiImageJob, utcBudgetDate } from "./_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  if (status === 500) console.error("[admin/ai-image]", error);
  return NextResponse.json({ error: status === 500 ? "Unable to access AI image jobs" : message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = adminDb();
    const budgetDate = utcBudgetDate();
    const [jobsSnapshot, workerSnapshot, budgetSnapshot, promptSnapshot] = await Promise.all([
      db.collection(AI_IMAGE_COLLECTION).orderBy("createdAt", "desc").limit(40).get(),
      db.doc(AI_IMAGE_WORKER_DOCUMENT).get(),
      db.collection("adminAiImageBudgets").doc(budgetDate).get(),
      db.doc(AI_IMAGE_PROMPT_DOCUMENT).get(),
    ]);
    const jobs = jobsSnapshot.docs.map(serializeAiImageJob).filter((job): job is NonNullable<typeof job> => job !== null);
    const worker = workerSnapshot.data() as
      | { lastSeenAt?: { toDate?: () => Date }; host?: string; state?: string; currentJobId?: string }
      | undefined;
    const lastSeenAt = worker?.lastSeenAt?.toDate?.()?.toISOString() ?? null;
    const budget = budgetSnapshot.data() as { reservedUsd?: number; jobsCount?: number } | undefined;
    return NextResponse.json({
      jobs,
      config: aiImageConfig(promptSnapshot.data()?.template),
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
    const db = adminDb();
    const rawSubject = typeof payload.subject === "string"
      ? payload.subject
      : typeof payload.prompt === "string"
        ? payload.prompt
        : "";
    const promptSnapshot = await db.doc(AI_IMAGE_PROMPT_DOCUMENT).get();
    const promptTemplate = normalizePromptTemplate(promptSnapshot.data()?.template);
    const { subject, prompt } = resolveImageGenerationPrompt(rawSubject, promptTemplate);
    if (subject.length < 2 || subject.length > AI_IMAGE_SUBJECT_MAX_LENGTH) {
      return NextResponse.json({ error: `Subject must contain 2–${AI_IMAGE_SUBJECT_MAX_LENGTH} characters` }, { status: 400 });
    }
    if (!isAiImageProvider(payload.provider)) {
      return NextResponse.json({ error: "Provider must be sora or veo" }, { status: 400 });
    }
    if (payload.costConfirmed !== true) {
      return NextResponse.json({ error: "Paid generation must be explicitly confirmed" }, { status: 400 });
    }

    const config = aiImageConfig(promptTemplate);
    if (!config.paidGenerationEnabled) {
      return NextResponse.json(
        { error: "Paid AI image generation is disabled on the server (AI_IMAGE_PAID_GENERATION_ENABLED / AI_VIDEO_PAID_GENERATION_ENABLED)" },
        { status: 403 },
      );
    }

    const provider = payload.provider;
    const estimatedCostUsd = config.prices[provider];
    const budgetDate = utcBudgetDate();
    const jobRef = db.collection(AI_IMAGE_COLLECTION).doc();
    const budgetRef = db.collection("adminAiImageBudgets").doc(budgetDate);

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
        subject,
        prompt,
        provider,
        language: "en-US",
        status: "queued",
        stage: "queued",
        progress: 0,
        sendToTelegram: payload.sendToTelegram !== false,
        costConfirmed: true,
        estimatedCostUsd,
        actualCostUsd: null,
        budgetDate,
        budgetReservationStatus: "reserved",
        tokenUsage: null,
        providerUsage: {
          model: provider === "veo" ? config.veoModel : config.soraModel,
          size: provider === "veo" ? AI_IMAGE_GEMINI_SIZE : AI_IMAGE_SIZE,
          quality: AI_IMAGE_QUALITY,
          aspectRatio: AI_IMAGE_ASPECT_RATIO,
        },
        imageUrl: "",
        imageStoragePath: "",
        mimeType: "",
        telegramMessageId: null,
        telegramError: "",
        telegramStatus: payload.sendToTelegram === false ? "disabled" : "pending",
        error: "",
        retryCount: 0,
        retryTelegramOnly: false,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
      });
    });

    const snapshot = await jobRef.get();
    return NextResponse.json({ job: serializeAiImageJob(snapshot) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "DAILY_JOB_LIMIT") {
      return NextResponse.json({ error: "Daily AI image job limit reached" }, { status: 429 });
    }
    if (message === "DAILY_BUDGET_LIMIT") {
      return NextResponse.json({ error: "Daily AI image budget would be exceeded" }, { status: 429 });
    }
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const uid = await requireAdmin(request);
    const payload = (await request.json()) as Record<string, unknown>;
    const reset = payload.reset === true;
    const template = reset
      ? AI_IMAGE_GOTHIC_PROMPT_TEMPLATE
      : typeof payload.promptTemplate === "string"
        ? payload.promptTemplate.trim()
        : "";
    if (!template || template.length > AI_IMAGE_TEMPLATE_MAX_LENGTH) {
      return NextResponse.json({ error: `Prompt template must contain 1–${AI_IMAGE_TEMPLATE_MAX_LENGTH} characters` }, { status: 400 });
    }
    if (!template.includes("[SUBJECT]")) {
      return NextResponse.json({ error: "Prompt template must include [SUBJECT]" }, { status: 400 });
    }

    await adminDb().doc(AI_IMAGE_PROMPT_DOCUMENT).set(
      {
        template,
        updatedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return NextResponse.json({ config: aiImageConfig(template) });
  } catch (error) {
    return apiError(error);
  }
}
