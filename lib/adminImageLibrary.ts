import type { AiImageProvider } from "@/lib/adminAiImage";
import { sourceLabelForImage } from "@/lib/adminAiImage";

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
};

export function imageSourceLabel(source: AiImageProvider) {
  return sourceLabelForImage(source);
}
