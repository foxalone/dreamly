export const AI_IMAGE_COLLECTION = "adminAiImageJobs";
export const AI_IMAGE_WORKER_DOCUMENT = "adminSystem/aiImageWorker";
export const AI_IMAGE_PROMPT_DOCUMENT = "adminSystem/aiImagePrompt";
export const AI_IMAGE_SIZE = "1024x1536" as const;
export const AI_IMAGE_QUALITY = "medium" as const;
export const AI_IMAGE_ASPECT_RATIO = "9:16" as const;
export const AI_IMAGE_GEMINI_SIZE = "1K" as const;
export const AI_IMAGE_SUBJECT_MAX_LENGTH = 300;
export const AI_IMAGE_TEMPLATE_MAX_LENGTH = 8_000;

export const AI_IMAGE_GOTHIC_PROMPT_TEMPLATE = `Create a visually striking image of **[SUBJECT]** in a consistent **dark gothic dreamlike aesthetic**.

The image should feel mysterious, elegant, emotional, and slightly surreal, as if seen inside a vivid dream.

**Visual style:** semi-realistic cinematic digital art, highly detailed, refined, sophisticated, gothic romanticism, subtle dark fantasy influence, realistic textures and lighting, beautiful rather than frightening.

**Atmosphere:** mysterious, melancholic, hypnotic, magical, quiet, otherworldly, emotionally evocative.

**Lighting:** dramatic soft cinematic lighting, subtle moonlight, gentle glow, deep shadows, soft mist, volumetric light, strong separation between the subject and background.

**Color palette:** deep black, charcoal, midnight blue, muted violet, dark burgundy, cold silver, with subtle warm golden highlights when appropriate.

**Composition:** one clear central subject, visually dominant and immediately recognizable, elegant framing, cinematic depth, uncluttered background, strong silhouette, balanced composition.

**Environment:** dark atmospheric dreamscape, subtle fog or haze, softly blurred background elements, mysterious depth, tasteful gothic details where appropriate.

**Rendering:** premium cinematic quality, semi-photorealistic, detailed textures, realistic materials, soft depth of field, subtle film grain, polished editorial artwork, high visual impact.

Avoid cartoon style, anime, childish fantasy, excessive horror, gore, monsters unless specifically required by the subject, overly saturated colors, cheap fantasy-art appearance, busy compositions, text, captions, logos, frames, or watermarks.

The final image should look like part of a **luxurious unified gothic dream dictionary collection**, instantly recognizable as belonging to the same visual world.`;

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
  subject: string;
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
  promptTemplate: string;
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

export function normalizePromptTemplate(value: unknown) {
  const template = typeof value === "string" ? value.trim() : "";
  if (!template || template.length > AI_IMAGE_TEMPLATE_MAX_LENGTH || !template.includes("[SUBJECT]")) {
    return AI_IMAGE_GOTHIC_PROMPT_TEMPLATE;
  }
  return template;
}

export function buildGothicImagePrompt(subject: string, template = AI_IMAGE_GOTHIC_PROMPT_TEMPLATE) {
  const cleaned = subject.trim().replace(/\s+/g, " ");
  const source = normalizePromptTemplate(template);
  if (!cleaned) return source;
  return source.replaceAll("[SUBJECT]", cleaned);
}

export function resolveImageGenerationPrompt(input: string, template = AI_IMAGE_GOTHIC_PROMPT_TEMPLATE) {
  const trimmed = input.trim();
  return {
    subject: trimmed.slice(0, AI_IMAGE_SUBJECT_MAX_LENGTH),
    prompt: buildGothicImagePrompt(trimmed, template),
  };
}
