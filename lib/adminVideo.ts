export const MAX_SHORT_DURATION_SECONDS = 45;

export type AdminVideoJobStatus = "queued" | "processing" | "completed" | "failed";
export type AdminVideoMode = "free" | "mixed";

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
