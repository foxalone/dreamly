import { type DocumentSnapshot } from "firebase-admin/firestore";
import {
  AI_IMAGE_ASPECT_RATIO,
  AI_IMAGE_GEMINI_SIZE,
  AI_IMAGE_QUALITY,
  AI_IMAGE_SIZE,
  type AdminAiImageJob,
  type AiImageJobStatus,
  type AiImageProvider,
  type AiImageProviderUsage,
  type AiImagePublicConfig,
  type AiImageTokenUsage,
  roundUsd,
} from "@/lib/adminAiImage";

type TimestampLike = { toDate?: () => Date } | null;

type StoredAiImageJob = Partial<Omit<AdminAiImageJob, "id" | "createdAt" | "startedAt" | "completedAt">> & {
  createdAt?: TimestampLike;
  startedAt?: TimestampLike;
  completedAt?: TimestampLike;
  status?: AiImageJobStatus;
  tokenUsage?: AiImageTokenUsage | null;
  providerUsage?: AiImageProviderUsage;
};

export function finiteEnv(name: string, fallback: number, minimum = 0) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function paidGenerationEnabled() {
  const imageFlag = process.env.AI_IMAGE_PAID_GENERATION_ENABLED?.trim().toLowerCase();
  if (imageFlag === "true" || imageFlag === "false") return imageFlag === "true";
  return process.env.AI_VIDEO_PAID_GENERATION_ENABLED?.trim().toLowerCase() === "true";
}

export function aiImageConfig(): AiImagePublicConfig {
  const soraPriceUsd = finiteEnv("SORA_IMAGE_PRICE_USD", 0.015);
  const veoPriceUsd = finiteEnv("VEO_IMAGE_PRICE_USD", 0.07);
  return {
    paidGenerationEnabled: paidGenerationEnabled(),
    dailyBudgetUsd: finiteEnv("AI_IMAGE_DAILY_BUDGET_USD", 10),
    maxJobsPerDay: Math.floor(finiteEnv("AI_IMAGE_MAX_JOBS_PER_DAY", 50, 1)),
    soraModel: process.env.SORA_IMAGE_MODEL?.trim() || "gpt-image-1-mini",
    veoModel: process.env.VEO_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image",
    soraSize: AI_IMAGE_SIZE,
    soraQuality: AI_IMAGE_QUALITY,
    veoSize: AI_IMAGE_GEMINI_SIZE,
    veoAspectRatio: AI_IMAGE_ASPECT_RATIO,
    prices: {
      sora: roundUsd(soraPriceUsd),
      veo: roundUsd(veoPriceUsd),
    },
  };
}

export function utcBudgetDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function iso(value: TimestampLike | undefined) {
  return value?.toDate?.()?.toISOString() ?? null;
}

export function serializeAiImageJob(snapshot: DocumentSnapshot): AdminAiImageJob | null {
  const data = snapshot.data() as StoredAiImageJob | undefined;
  if (!data) return null;
  const provider: AiImageProvider = data.provider === "veo" ? "veo" : "sora";
  return {
    id: snapshot.id,
    subject: data.subject ?? data.prompt ?? "",
    prompt: data.prompt ?? "",
    provider,
    language: "en-US",
    status: data.status ?? "queued",
    stage: data.stage ?? "queued",
    progress: Math.max(0, Math.min(100, Number(data.progress ?? 0))),
    sendToTelegram: data.sendToTelegram !== false,
    costConfirmed: data.costConfirmed === true,
    estimatedCostUsd: Number(data.estimatedCostUsd ?? 0),
    actualCostUsd: data.actualCostUsd == null ? null : Number(data.actualCostUsd),
    budgetDate: data.budgetDate ?? "",
    tokenUsage: data.tokenUsage ?? null,
    providerUsage: data.providerUsage ?? {
      model: provider === "veo" ? "gemini-3.1-flash-image" : "gpt-image-1-mini",
      size: provider === "veo" ? AI_IMAGE_GEMINI_SIZE : AI_IMAGE_SIZE,
      quality: AI_IMAGE_QUALITY,
      aspectRatio: AI_IMAGE_ASPECT_RATIO,
    },
    imageUrl: data.imageUrl ?? "",
    mimeType: data.mimeType ?? "",
    telegramMessageId: data.telegramMessageId ?? null,
    telegramError: data.telegramError ?? "",
    error: data.error ?? "",
    createdBy: data.createdBy ?? "",
    createdAt: iso(data.createdAt) ?? new Date(0).toISOString(),
    startedAt: iso(data.startedAt),
    completedAt: iso(data.completedAt),
  };
}
