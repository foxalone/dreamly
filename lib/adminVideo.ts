export const MAX_SHORT_DURATION_SECONDS = 45;

export type AdminVideoJobStatus = "queued" | "processing" | "completed" | "failed";
export type AdminVideoMode = "free" | "mixed" | "pool";

/** Libraries the Stock Pool studio can search; keep in sync with scripts/stockPool.mjs. */
export const STOCK_POOL_PROVIDERS = ["pexels", "pixabay", "coverr"] as const;
export type StockPoolProvider = (typeof STOCK_POOL_PROVIDERS)[number];
export const STOCK_POOL_PROVIDER_LABELS: Record<StockPoolProvider, string> = {
  pexels: "Pexels",
  pixabay: "Pixabay",
  coverr: "Coverr",
};

export function normalizeStockPoolProviders(value: unknown): StockPoolProvider[] {
  const list = Array.isArray(value) ? value : [];
  const picked = STOCK_POOL_PROVIDERS.filter((provider) => list.includes(provider));
  return picked.length ? picked : [...STOCK_POOL_PROVIDERS];
}

export type AdminVideoMaterialSource = {
  provider: string;
  assetId: string;
  sourcePage: string;
  searchTerm: string;
  score?: number;
  reason?: string;
  cropped?: boolean;
};

export function adminVideoModeFrom(value: unknown): AdminVideoMode {
  return value === "mixed" || value === "pool" ? value : "free";
}

export type AdminVideoTokenUsage = {
  prompt: number;
  completion: number;
  total: number;
  model: string;
};

export type AdminVideoYouTubeMetadata = {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  thumbnailText: string;
  pinnedComment: string;
  category: string;
};

export type AdminVideoJob = {
  id: string;
  mode: AdminVideoMode;
  stockProviders: StockPoolProvider[];
  materialSources: AdminVideoMaterialSource[];
  poolPick: { aiPicked: number; total: number; error: string } | null;
  topic: string;
  language: "en-US";
  status: AdminVideoJobStatus;
  stage: string;
  maxDurationSeconds: number;
  sendToTelegram: boolean;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
  tokenUsage: AdminVideoTokenUsage | null;
  youtubeMetadata: AdminVideoYouTubeMetadata | null;
  videoUrl: string;
  telegramMessageId: number | null;
  telegramError: string;
  error: string;
};
