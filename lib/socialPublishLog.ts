export const NOTION_PROJECT_DREAMLY = "Dreamly";

export type SocialPlatform = "tiktok" | "instagram" | "facebook" | "threads" | "youtube" | "pinterest";
export type SocialAssetKind = "video" | "image";
export type NotionPlatform = "YouTube" | "TikTok" | "Instagram" | "Facebook" | "Threads" | "Pinterest";
export type NotionFormat = "Shorts" | "Reels" | "Video" | "Pin" | "Post";
export type NotionStatus = "Черновик" | "Запланировано" | "Опубликовано" | "Пропущено";

export type SocialPublishLogEntry = {
  key: string;
  kind: SocialAssetKind;
  title: string;
  project: string;
  platform: NotionPlatform;
  format: NotionFormat;
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

export const NOTION_PLATFORM_CODE: Record<NotionPlatform, string> = {
  YouTube: "Y",
  TikTok: "Ti",
  Instagram: "I",
  Facebook: "Fb",
  Threads: "Tr",
  Pinterest: "P",
};

export const CALENDAR_KIND_ICON: Record<SocialAssetKind, string> = {
  video: "🎬",
  image: "📝",
};

const PLATFORM_KEY_SUFFIX = /:(tiktok|instagram|facebook|threads|youtube|pinterest)$/i;

const VIDEO_PLATFORMS: SocialPlatform[] = ["tiktok", "instagram", "facebook", "threads", "youtube", "pinterest"];
const IMAGE_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "threads", "pinterest"];

export function publishLogKey(kind: SocialAssetKind, assetId: string, platform: SocialPlatform) {
  return `dreamly:${kind}:${assetId}:${platform}`;
}

export function isStaleGroupedKey(key: string) {
  return /^dreamly:(video|image):/.test(key) && !PLATFORM_KEY_SUFFIX.test(key);
}

export function calendarCardTitle(project: string, platform: NotionPlatform, kind: SocialAssetKind) {
  return `${NOTION_PLATFORM_CODE[platform]} ${CALENDAR_KIND_ICON[kind]} ${project}`.trim();
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

function entry(
  kind: SocialAssetKind,
  assetId: string,
  platform: SocialPlatform,
  title: string,
  publishedAt: string,
  status: NotionStatus,
  url: string,
  notes: string,
  project = NOTION_PROJECT_DREAMLY,
): SocialPublishLogEntry | null {
  if (!publishedAt) return null;
  return {
    key: publishLogKey(kind, assetId, platform),
    kind,
    title: asText(title) || assetId,
    project,
    platform: NOTION_PLATFORM[platform],
    format: notionFormat(kind, platform),
    status,
    publishedAt,
    url,
    notes,
  };
}

export function entriesFromVideoDoc(libraryId: string, data: Record<string, unknown>): SocialPublishLogEntry[] {
  const title = videoTitle(data);
  const notes = `video ${libraryId}`;
  const found: SocialPublishLogEntry[] = [];

  for (const platform of VIDEO_PLATFORMS) {
    const publishedAt = asText(data[`${platform}PublishedAt`]);
    const youtubeScheduled = platform === "youtube" ? asText(data.youtubeScheduledAt) : "";
    const youtubeStatus = asText(data.youtubeStatus);
    const when = publishedAt || (platform === "youtube" && youtubeStatus === "scheduled" ? youtubeScheduled : "");
    const status: NotionStatus =
      platform === "youtube" && !publishedAt && youtubeStatus === "scheduled" ? "Запланировано" : "Опубликовано";
    const row = entry(
      "video",
      libraryId,
      platform,
      title,
      when,
      status,
      publicPublishUrl(platform, {
        youtubeVideoId: asText(data.youtubeVideoId),
        pinterestPinId: asText(data.pinterestPinId),
        facebookPostId: asText(data.facebookPostId),
      }),
      notes,
    );
    if (row) found.push(row);
  }

  return found;
}

export function entriesFromImageDoc(jobId: string, data: Record<string, unknown>): SocialPublishLogEntry[] {
  const title = imageTitle(data);
  const notes = `image ${jobId}`;
  const found: SocialPublishLogEntry[] = [];

  for (const platform of IMAGE_PLATFORMS) {
    const publishedAt = asText(data[`${platform}PublishedAt`]);
    const row = entry(
      "image",
      jobId,
      platform,
      title,
      publishedAt,
      "Опубликовано",
      publicPublishUrl(platform, {
        pinterestPinId: asText(data.pinterestPinId),
        facebookPostId: asText(data.facebookPostId),
      }),
      notes,
    );
    if (row) found.push(row);
  }

  return found;
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
  project?: string;
}): SocialPublishLogEntry {
  return {
    key: publishLogKey(input.kind, input.assetId, input.platform),
    kind: input.kind,
    title: asText(input.title) || input.assetId,
    project: asText(input.project) || NOTION_PROJECT_DREAMLY,
    platform: NOTION_PLATFORM[input.platform],
    format: notionFormat(input.kind, input.platform),
    status: input.status || "Опубликовано",
    publishedAt: input.publishedAt,
    url: asText(input.url),
    notes: asText(input.notes),
  };
}
