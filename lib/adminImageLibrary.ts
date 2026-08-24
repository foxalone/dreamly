import type { AiImageProvider } from "@/lib/adminAiImage";
import { sourceLabelForImage } from "@/lib/adminAiImage";

export type AdminImagePublishPlatform = "instagram" | "facebook" | "threads" | "pinterest";

export type AdminImageLibraryPublished = {
  instagram: boolean;
  facebook: boolean;
  threads: boolean;
  pinterest: boolean;
};

export type AdminImagePublishState = "idle" | "publishing" | "published" | "failed";

export type AdminImageLibraryItem = {
  id: string;
  subject: string;
  prompt: string;
  source: AiImageProvider;
  sourceLabel: string;
  imageUrl: string;
  mimeType: string;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  createdAt: string;
  dreamSlug: string;
  pageUrl: string;
  published: AdminImageLibraryPublished;
  threadsState: AdminImagePublishState;
  threadsError: string;
  pinterestState: AdminImagePublishState;
  pinterestError: string;
  pinterestPinId: string;
};

export function imageSourceLabel(source: AiImageProvider) {
  return sourceLabelForImage(source);
}
