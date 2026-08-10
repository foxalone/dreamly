import { type DocumentSnapshot } from "firebase-admin/firestore";
import {
  AI_VIDEO_MAX_DURATION_SECONDS,
  AI_VIDEO_MODES,
  AI_VIDEO_SIZE,
  type AdminAiVideoJob,
  type AiVideoJobStatus,
  type AiVideoProviderUsage,
  type AiVideoPublicConfig,
  type AiVideoSceneState,
  type AiVideoTokenUsage,
  type AiVideoYouTubeMetadata,
  roundUsd,
} from "@/lib/adminAiVideo";

type TimestampLike = { toDate?: () => Date } | null;

type StoredAiVideoJob = Partial<Omit<AdminAiVideoJob, "id" | "createdAt" | "startedAt" | "completedAt">> & {
  createdAt?: TimestampLike;
  startedAt?: TimestampLike;
  completedAt?: TimestampLike;
  status?: AiVideoJobStatus;
  tokenUsage?: AiVideoTokenUsage | null;
  providerUsage?: AiVideoProviderUsage;
  youtubeMetadata?: AiVideoYouTubeMetadata | null;
  sceneStates?: AiVideoSceneState[];
};

export function finiteEnv(name: string, fallback: number, minimum = 0) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

export function aiVideoConfig(): AiVideoPublicConfig {
  const pricePerSecondUsd = finiteEnv("SORA_PRICE_PER_SECOND_USD", 0.1);
  return {
    paidGenerationEnabled: process.env.AI_VIDEO_PAID_GENERATION_ENABLED?.trim().toLowerCase() === "true",
    pricePerSecondUsd,
    dailyBudgetUsd: finiteEnv("AI_VIDEO_DAILY_BUDGET_USD", 5),
    maxJobsPerDay: Math.floor(finiteEnv("AI_VIDEO_MAX_JOBS_PER_DAY", 2, 1)),
    model: process.env.SORA_VIDEO_MODEL?.trim() || "sora-2",
    prices: {
      preview: roundUsd(AI_VIDEO_MODES.preview.generatedSeconds * pricePerSecondUsd),
      standard: roundUsd(AI_VIDEO_MODES.standard.generatedSeconds * pricePerSecondUsd),
    },
  };
}

export function utcBudgetDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function iso(value: TimestampLike | undefined) {
  return value?.toDate?.()?.toISOString() ?? null;
}

export function serializeAiVideoJob(snapshot: DocumentSnapshot): AdminAiVideoJob | null {
  const data = snapshot.data() as StoredAiVideoJob | undefined;
  if (!data) return null;
  const mode = data.mode === "preview" ? "preview" : "standard";
  const modeConfig = AI_VIDEO_MODES[mode];
  return {
    id: snapshot.id,
    topic: data.topic ?? "",
    mode,
    language: "en-US",
    status: data.status ?? "queued",
    stage: data.stage ?? "queued",
    progress: Math.max(0, Math.min(100, Number(data.progress ?? 0))),
    sceneCount: data.sceneCount ?? modeConfig.sceneCount,
    sceneSeconds: data.sceneSeconds ?? modeConfig.sceneSeconds,
    generatedSeconds: data.generatedSeconds ?? data.providerUsage?.generatedSeconds ?? 0,
    maxDurationSeconds: data.maxDurationSeconds ?? AI_VIDEO_MAX_DURATION_SECONDS,
    sendToTelegram: data.sendToTelegram !== false,
    costConfirmed: data.costConfirmed === true,
    estimatedCostUsd: Number(data.estimatedCostUsd ?? 0),
    budgetDate: data.budgetDate ?? "",
    script: data.script ?? "",
    scenePrompts: Array.isArray(data.scenePrompts) ? data.scenePrompts : [],
    providerTaskIds: Array.isArray(data.providerTaskIds) ? data.providerTaskIds : [],
    sceneStates: Array.isArray(data.sceneStates) ? data.sceneStates : [],
    tokenUsage: data.tokenUsage ?? null,
    providerUsage: data.providerUsage ?? {
      model: "sora-2",
      size: AI_VIDEO_SIZE,
      requestedSeconds: 0,
      generatedSeconds: 0,
    },
    youtubeMetadata: data.youtubeMetadata ?? null,
    videoUrl: data.videoUrl ?? "",
    thumbnailUrl: data.thumbnailUrl ?? "",
    telegramMessageId: data.telegramMessageId ?? null,
    telegramError: data.telegramError ?? "",
    error: data.error ?? "",
    failedSceneIndex: Number.isInteger(data.failedSceneIndex) ? Number(data.failedSceneIndex) : null,
    createdBy: data.createdBy ?? "",
    createdAt: iso(data.createdAt) ?? new Date(0).toISOString(),
    startedAt: iso(data.startedAt),
    completedAt: iso(data.completedAt),
  };
}
