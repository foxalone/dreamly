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
  type AiVideoStockAsset,
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
  stockAssets?: AiVideoStockAsset[];
};

export function finiteEnv(name: string, fallback: number, minimum = 0) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

export function aiVideoConfig(): AiVideoPublicConfig {
  const pricePerSecondUsd = finiteEnv("SORA_BATCH_PRICE_PER_SECOND_USD", 0.05);
  const veoPricePerSecondUsd = finiteEnv("VEO_LITE_PRICE_PER_SECOND_USD", 0.03);
  return {
    paidGenerationEnabled: process.env.AI_VIDEO_PAID_GENERATION_ENABLED?.trim().toLowerCase() === "true",
    pricePerSecondUsd,
    veoPricePerSecondUsd,
    dailyBudgetUsd: finiteEnv("AI_VIDEO_DAILY_BUDGET_USD", 5),
    maxJobsPerDay: Math.floor(finiteEnv("AI_VIDEO_MAX_JOBS_PER_DAY", 20, 1)),
    model: process.env.SORA_VIDEO_MODEL?.trim() || "sora-2",
    veoModel: process.env.VEO_VIDEO_MODEL?.trim() || "veo-3.1-lite-generate-001",
    prices: {
      preview: roundUsd(AI_VIDEO_MODES.preview.generatedSeconds * pricePerSecondUsd),
      standard: roundUsd(AI_VIDEO_MODES.standard.generatedSeconds * pricePerSecondUsd),
      combined: roundUsd(AI_VIDEO_MODES.combined.generatedSeconds * pricePerSecondUsd),
      veo: roundUsd(AI_VIDEO_MODES.veo.generatedSeconds * veoPricePerSecondUsd),
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
  const mode = data.mode === "preview" || data.mode === "combined" || data.mode === "veo" ? data.mode : "standard";
  const modeConfig = AI_VIDEO_MODES[mode];
  return {
    id: snapshot.id,
    topic: data.topic ?? "",
    mode,
    provider: mode === "veo" ? "veo" : "sora",
    language: "en-US",
    status: data.status ?? "queued",
    stage: data.stage ?? "queued",
    progress: Math.max(0, Math.min(100, Number(data.progress ?? 0))),
    sceneCount: data.sceneCount ?? modeConfig.sceneCount,
    soraSceneCount: data.soraSceneCount ?? modeConfig.soraSceneCount,
    stockSceneCount: data.stockSceneCount ?? modeConfig.stockSceneCount,
    sceneSeconds: data.sceneSeconds ?? modeConfig.sceneSeconds,
    generatedSeconds: data.generatedSeconds ?? data.providerUsage?.generatedSeconds ?? 0,
    maxDurationSeconds: data.maxDurationSeconds ?? AI_VIDEO_MAX_DURATION_SECONDS,
    sendToTelegram: data.sendToTelegram !== false,
    costConfirmed: data.costConfirmed === true,
    estimatedCostUsd: Number(data.estimatedCostUsd ?? 0),
    budgetDate: data.budgetDate ?? "",
    script: data.script ?? "",
    scenePrompts: Array.isArray(data.scenePrompts) ? data.scenePrompts : [],
    stockSearchTerms: Array.isArray(data.stockSearchTerms) ? data.stockSearchTerms : [],
    stockAssets: Array.isArray(data.stockAssets) ? data.stockAssets : [],
    providerTaskIds: Array.isArray(data.providerTaskIds) ? data.providerTaskIds : [],
    sceneStates: Array.isArray(data.sceneStates) ? data.sceneStates : [],
    batchId: data.batchId ?? "",
    batchStatus: data.batchStatus ?? "",
    tokenUsage: data.tokenUsage ?? null,
    providerUsage: data.providerUsage ?? {
      model: mode === "veo" ? "veo-3.1-lite-generate-001" : "sora-2",
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
