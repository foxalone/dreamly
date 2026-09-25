/** A YouTube video attached by the admin to one dream-dictionary page. */
export const DREAM_PAGE_VIDEO_COLLECTION = "dreamPageVideos";

export type DreamPageVideo = {
  slug: string;
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  /** ISO date the video was published on YouTube (falls back to when it was attached). */
  uploadDate: string;
  /** ISO 8601 duration from the YouTube API, e.g. "PT4M12S"; "" when unknown. */
  duration: string;
};

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a bare id or any usual YouTube link (watch, youtu.be, shorts, embed, live, m./music.). */
export function parseYouTubeId(input: string): string {
  const value = String(input ?? "").trim();
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return "";
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let candidate = "";
  if (host === "youtu.be") candidate = url.pathname.split("/")[1] ?? "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    candidate = url.searchParams.get("v") ?? "";
    if (!candidate) {
      const [, kind, id] = url.pathname.split("/");
      if (["shorts", "embed", "live", "v"].includes(kind ?? "")) candidate = id ?? "";
    }
  }
  return ID.test(candidate) ? candidate : "";
}

/** "PT4M12S" → 252. Unknown/invalid → 0. */
export function isoDurationSeconds(duration: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(duration ?? ""));
  if (!match || duration === "P" || duration === "PT") return 0;
  const [, days, hours, minutes, seconds] = match.map((part) => Number(part || 0));
  return days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
}

/** Rounded minutes for the "Watch the 4-min video" button; 0 = unknown (show the plain label). */
export function videoMinutes(duration: string): number {
  const seconds = isoDurationSeconds(duration);
  return seconds ? Math.max(1, Math.round(seconds / 60)) : 0;
}

export function youtubeThumbnail(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(youtubeId: string) {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
}

export function youtubeWatchPageUrl(youtubeId: string) {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}
