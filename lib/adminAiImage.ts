export const AI_IMAGE_COLLECTION = "adminAiImageJobs";
export const AI_IMAGE_WORKER_DOCUMENT = "adminSystem/aiImageWorker";
export const AI_IMAGE_SIZE = "1024x1536" as const;
export const AI_IMAGE_QUALITY = "medium" as const;
export const AI_IMAGE_ASPECT_RATIO = "9:16" as const;
export const AI_IMAGE_GEMINI_SIZE = "1K" as const;

export type AiImageProvider = "sora" | "veo";
export type AiImageJobStatus = "queued" | "processing" | "completed" | "failed";

export type AiImageTokenUsage = {
  input: number;
  output: number;
  total: number;
  imageOutput: number;
  textOutput: number;
  model: string;
};

export type AiImageProviderUsage = {
  model: string;
  size: string;
  quality: string;
  aspectRatio: string;
};

export type AdminAiImageJob = {
  id: string;
  prompt: string;
  provider: AiImageProvider;
  language: "en-US";
  status: AiImageJobStatus;
  stage: string;
  progress: number;
  sendToTelegram: boolean;
  costConfirmed: boolean;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  budgetDate: string;
  tokenUsage: AiImageTokenUsage | null;
  providerUsage: AiImageProviderUsage;
  imageUrl: string;
  mimeType: string;
  telegramMessageId: number | null;
  telegramError: string;
  error: string;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type AiImagePublicConfig = {
  paidGenerationEnabled: boolean;
  dailyBudgetUsd: number;
  maxJobsPerDay: number;
  soraModel: string;
  veoModel: string;
  soraSize: typeof AI_IMAGE_SIZE;
  soraQuality: typeof AI_IMAGE_QUALITY;
  veoSize: typeof AI_IMAGE_GEMINI_SIZE;
  veoAspectRatio: typeof AI_IMAGE_ASPECT_RATIO;
  prices: Record<AiImageProvider, number>;
};

export function isAiImageProvider(value: unknown): value is AiImageProvider {
  return value === "sora" || value === "veo";
}

export function roundUsd(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function sourceLabelForImage(provider: AiImageProvider) {
  return provider === "veo" ? "Image · Veo" : "Image · Sora";
}
