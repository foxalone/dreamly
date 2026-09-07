export const IMAGE_SOCIAL_PLATFORMS = ["instagram", "facebook", "threads", "pinterest"] as const;

export type ImageSocialPlatform = (typeof IMAGE_SOCIAL_PLATFORMS)[number];

export type ImageSocialPublishOutcome = "published" | "skipped" | "failed";

export function imageSocialPlatformLabel(platform: ImageSocialPlatform) {
  if (platform === "instagram") return "Instagram";
  if (platform === "threads") return "Threads";
  if (platform === "pinterest") return "Pinterest";
  return "Facebook";
}

export function classifyImageSocialError(message: string): "already" | "disconnected" | "failed" {
  const text = String(message || "").toLowerCase();
  if (text.includes("already published")) return "already";
  if (
    text.includes("not connected") ||
    text.includes("not configured") ||
    text.includes("not linked") ||
    text.includes("instagram is not linked")
  ) {
    return "disconnected";
  }
  return "failed";
}

export function imageSocialsAllPublished(published: Partial<Record<ImageSocialPlatform, boolean>> | undefined) {
  return IMAGE_SOCIAL_PLATFORMS.every((platform) => Boolean(published?.[platform]));
}

export function imageSocialsAnyPublished(published: Partial<Record<ImageSocialPlatform, boolean>> | undefined) {
  return IMAGE_SOCIAL_PLATFORMS.some((platform) => Boolean(published?.[platform]));
}
