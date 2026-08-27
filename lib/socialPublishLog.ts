export const NOTION_PROJECT_DREAMLY = "Dreamly";

export type SocialPlatform = "tiktok" | "instagram" | "facebook" | "threads" | "youtube" | "pinterest";
export type SocialAssetKind = "video" | "image";
export type NotionPlatform = "YouTube" | "TikTok" | "Instagram" | "Facebook" | "Threads" | "Pinterest";
export type NotionFormat = "Shorts" | "Reels" | "Video" | "Pin" | "Post";
export type NotionStatus = "Черновик" | "Запланировано" | "Опубликовано" | "Пропущено";

export type SocialPublishLogEntry = {
  key: string;
  title: string;
  platforms: NotionPlatform[];
  formats: NotionFormat[];
  status: NotionStatus;
  publishedAt: string;
  url: string;
  notes: string;
};

export const NOTION_PLATFORM: Record<SocialPlatform, NotionPlatform> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  youtube: "YouTube",
  pinterest: "Pinterest",
};

export const NOTION_PLATFORM_ORDER: NotionPlatform[] = [
  "YouTube",
  "TikTok",
  "Instagram",
  "Facebook",
  "Threads",
  "Pinterest",
];

export const NOTION_PLATFORM_EMOJI: Record<NotionPlatform, string> = {
  YouTube: "▶️",
  TikTok: "🎵",
  Instagram: "📸",
  Facebook: "📘",
  Threads: "🧵",
  Pinterest: "📌",
};

const PLATFORM_TITLE_PREFIX = new RegExp(
  `^(?:${Object.values(NOTION_PLATFORM_EMOJI).join("|")})+\\s*`,
);

const LEGACY_PLATFORM_KEY = /:(tiktok|instagram|facebook|threads|youtube|pinterest)$/i;

const VIDEO_PLATFORMS: SocialPlatform[] = ["tiktok", "instagram", "facebook", "threads", "youtube", "pinterest"];
const IMAGE_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "threads", "pinterest"];

export function publishLogKey(kind: SocialAssetKind, assetId: string) {
  return `dreamly:${kind}:${assetId}`;
}

export function isLegacyPlatformKey(key: string) {
  return LEGACY_PLATFORM_KEY.test(key);
}

export function sortNotionPlatforms(platforms: NotionPlatform[]) {
  const unique = new Set(platforms);
  return NOTION_PLATFORM_ORDER.filter((platform) => unique.has(platform));
}

export function titledWithPlatformIcons(title: string, platforms: NotionPlatform[]) {
  const body = String(title || "").replace(PLATFORM_TITLE_PREFIX, "").trim();
  const icons = sortNotionPlatforms(platforms)
    .map((platform) => NOTION_PLATFORM_EMOJI[platform])
    .join("");
  return `${icons} ${body}`.trim();
}

export function notionFormat(kind: SocialAssetKind, platform: SocialPlatform): NotionFormat {
  if (platform === "pinterest") return "Pin";
  if (platform === "threads") return "Post";
  if (platform === "youtube") return "Shorts";
  if (platform === "tiktok") return "Video";
  if (platform === "instagram" || platform === "facebook") {
    return kind === "video" ? "Reels" : "Post";
  }
  return "Post";
}

export function publicPublishUrl(
  platform: SocialPlatform,
  ids: {
    youtubeVideoId?: string;
    pinterestPinId?: string;
    facebookPostId?: string;
  } = {},
) {
  const youtubeId = String(ids.youtubeVideoId || "").trim();
  if (platform === "youtube" && youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;

  const pinId = String(ids.pinterestPinId || "").trim();
  if (platform === "pinterest" && pinId) return `https://www.pinterest.com/pin/${pinId}/`;

  const facebookId = String(ids.facebookPostId || "").trim();
  if (platform === "facebook" && facebookId) {
    const split = facebookId.split("_");
    if (split.length === 2 && split[0] && split[1]) {
      return `https://www.facebook.com/${split[0]}/posts/${split[1]}`;
    }
    return `https://www.facebook.com/${facebookId}`;
  }

  return "";
}

function asText(value: unknown) {
  return String(value || "").trim();
}

function videoTitle(data: Record<string, unknown>) {
  const meta = data.youtubeMetadata as { title?: string } | undefined;
  return asText(meta?.title) || asText(data.topic) || "Untitled video";
}

function imageTitle(data: Record<string, unknown>) {
  return asText(data.subject) || asText(data.prompt) || "Untitled image";
}

function earlierIso(left: string, right: string) {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs)) return right;
  if (!Number.isFinite(rightMs)) return left;
  return leftMs <= rightMs ? left : right;
}

function preferredUrl(platforms: NotionPlatform[], urls: Partial<Record<NotionPlatform, string>>) {
  for (const platform of sortNotionPlatforms(platforms)) {
    const url = asText(urls[platform]);
    if (url) return url;
  }
  return "";
}

function mergedStatus(statuses: NotionStatus[]): NotionStatus {
  if (statuses.includes("Опубликовано")) return "Опубликовано";
  if (statuses.includes("Запланировано")) return "Запланировано";
  return statuses[0] || "Опубликовано";
}

type PlatformPart = {
  platform: NotionPlatform;
  format: NotionFormat;
  status: NotionStatus;
  publishedAt: string;
  url: string;
};

export function mergePlatformParts(
  kind: SocialAssetKind,
  assetId: string,
  title: string,
  notes: string,
  parts: PlatformPart[],
  extraPlatforms: NotionPlatform[] = [],
): SocialPublishLogEntry | null {
  if (parts.length === 0 && extraPlatforms.length === 0) return null;
  const platforms = sortNotionPlatforms([...parts.map((part) => part.platform), ...extraPlatforms]);
  if (platforms.length === 0) return null;
  const publishedAt = parts.reduce((earliest, part) => earlierIso(earliest, part.publishedAt), parts[0]?.publishedAt || "");
  const urls: Partial<Record<NotionPlatform, string>> = {};
  for (const part of parts) {
    if (part.url) urls[part.platform] = part.url;
  }
  return {
    key: publishLogKey(kind, assetId),
    title: asText(title) || assetId,
    platforms,
    formats: [...new Set(parts.map((part) => part.format))],
    status: mergedStatus(parts.map((part) => part.status)),
    publishedAt,
    url: preferredUrl(platforms, urls),
    notes,
  };
}

function collectVideoParts(libraryId: string, data: Record<string, unknown>): PlatformPart[] {
  const parts: PlatformPart[] = [];
  for (const platform of VIDEO_PLATFORMS) {
    const publishedAt = asText(data[`${platform}PublishedAt`]);
    const youtubeScheduled = platform === "youtube" ? asText(data.youtubeScheduledAt) : "";
    const youtubeStatus = asText(data.youtubeStatus);
    const when = publishedAt || (platform === "youtube" && youtubeStatus === "scheduled" ? youtubeScheduled : "");
    if (!when) continue;
    parts.push({
      platform: NOTION_PLATFORM[platform],
      format: notionFormat("video", platform),
      status:
        platform === "youtube" && !publishedAt && youtubeStatus === "scheduled" ? "Запланировано" : "Опубликовано",
      publishedAt: when,
      url: publicPublishUrl(platform, {
        youtubeVideoId: asText(data.youtubeVideoId),
        pinterestPinId: asText(data.pinterestPinId),
        facebookPostId: asText(data.facebookPostId),
      }),
    });
  }
  return parts;
}

function collectImageParts(jobId: string, data: Record<string, unknown>): PlatformPart[] {
  const parts: PlatformPart[] = [];
  for (const platform of IMAGE_PLATFORMS) {
    const publishedAt = asText(data[`${platform}PublishedAt`]);
    if (!publishedAt) continue;
    parts.push({
      platform: NOTION_PLATFORM[platform],
      format: notionFormat("image", platform),
      status: "Опубликовано",
      publishedAt,
      url: publicPublishUrl(platform, {
        pinterestPinId: asText(data.pinterestPinId),
        facebookPostId: asText(data.facebookPostId),
      }),
    });
  }
  return parts;
}

export function entriesFromVideoDoc(libraryId: string, data: Record<string, unknown>): SocialPublishLogEntry[] {
  const row = mergePlatformParts("video", libraryId, videoTitle(data), `video ${libraryId}`, collectVideoParts(libraryId, data));
  return row ? [row] : [];
}

export function entriesFromImageDoc(jobId: string, data: Record<string, unknown>): SocialPublishLogEntry[] {
  const row = mergePlatformParts("image", jobId, imageTitle(data), `image ${jobId}`, collectImageParts(jobId, data));
  return row ? [row] : [];
}

export function buildPublishLogEntry(input: {
  kind: SocialAssetKind;
  assetId: string;
  platform: SocialPlatform;
  title: string;
  publishedAt: string;
  status?: NotionStatus;
  url?: string;
  notes?: string;
}): SocialPublishLogEntry {
  return mergePlatformParts(
    input.kind,
    input.assetId,
    input.title,
    asText(input.notes),
    [
      {
        platform: NOTION_PLATFORM[input.platform],
        format: notionFormat(input.kind, input.platform),
        status: input.status || "Опубликовано",
        publishedAt: input.publishedAt,
        url: asText(input.url),
      },
    ],
  ) as SocialPublishLogEntry;
}
