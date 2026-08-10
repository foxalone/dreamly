export const AI_VIDEO_COLLECTION = "adminAiVideoJobs";
export const AI_VIDEO_WORKER_DOCUMENT = "adminSystem/aiVideoWorker";
export const AI_VIDEO_MAX_DURATION_SECONDS = 45;
export const AI_VIDEO_SIZE = "720x1280" as const;

export const AI_VIDEO_MODES = {
  preview: { sceneCount: 1, soraSceneCount: 1, stockSceneCount: 0, sceneSeconds: 4, generatedSeconds: 4 },
  standard: { sceneCount: 4, soraSceneCount: 4, stockSceneCount: 0, sceneSeconds: 8, generatedSeconds: 32 },
  combined: { sceneCount: 4, soraSceneCount: 1, stockSceneCount: 3, sceneSeconds: 8, generatedSeconds: 8 },
} as const;

export type AiVideoMode = keyof typeof AI_VIDEO_MODES;
export type AiVideoJobStatus = "queued" | "processing" | "completed" | "failed";

export type AiVideoTokenUsage = {
  prompt: number;
  completion: number;
  total: number;
  model: string;
};

export type AiVideoProviderUsage = {
  model: string;
  size: typeof AI_VIDEO_SIZE;
  requestedSeconds: number;
  generatedSeconds: number;
};

export type AiVideoYouTubeMetadata = {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  thumbnailText: string;
  pinnedComment: string;
  category: string;
};

export type AiVideoSceneState = {
  index: number;
  status: "pending" | "submitted" | "rendering" | "completed" | "failed";
  taskId: string | null;
  progress: number;
  error: string;
  safePromptRetryCount: number;
};

export type AiVideoStockAsset = {
  index: number;
  searchTerm: string;
  provider: "pexels";
  providerId: number | null;
  photographer: string;
  sourceUrl: string;
};

export type AdminAiVideoJob = {
  id: string;
  topic: string;
  mode: AiVideoMode;
  language: "en-US";
  status: AiVideoJobStatus;
  stage: string;
  progress: number;
  sceneCount: number;
  soraSceneCount: number;
  stockSceneCount: number;
  sceneSeconds: number;
  generatedSeconds: number;
  maxDurationSeconds: number;
  sendToTelegram: boolean;
  costConfirmed: boolean;
  estimatedCostUsd: number;
  budgetDate: string;
  script: string;
  scenePrompts: string[];
  stockSearchTerms: string[];
  stockAssets: AiVideoStockAsset[];
  providerTaskIds: Array<string | null>;
  sceneStates: AiVideoSceneState[];
  batchId: string;
  batchStatus: string;
  tokenUsage: AiVideoTokenUsage | null;
  providerUsage: AiVideoProviderUsage;
  youtubeMetadata: AiVideoYouTubeMetadata | null;
  videoUrl: string;
  thumbnailUrl: string;
  telegramMessageId: number | null;
  telegramError: string;
  error: string;
  failedSceneIndex: number | null;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type AiVideoPublicConfig = {
  paidGenerationEnabled: boolean;
  pricePerSecondUsd: number;
  dailyBudgetUsd: number;
  maxJobsPerDay: number;
  model: string;
  prices: Record<AiVideoMode, number>;
};

export function isAiVideoMode(value: unknown): value is AiVideoMode {
  return value === "preview" || value === "standard" || value === "combined";
}

export function roundUsd(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
