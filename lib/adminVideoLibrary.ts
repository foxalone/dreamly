export type AdminVideoLibrarySource = "free" | "free-mix" | "sora-preview" | "sora-standard" | "combined" | "veo";

export type AdminVideoPlatform =
  | "tiktok"
  | "instagram"
  | "facebook"
  | "threads"
  | "bluesky"
  | "youtube"
  | "pinterest"
  | "tumblr";

// YouTube releases a scheduled upload itself (status.publishAt), so it never
// enters this queue. The remaining connected batch targets are published by
// our cron worker. Pinterest is intentionally excluded until it is connected
// for production publishing.
export const QUEUED_SCHEDULE_PLATFORMS: AdminVideoPlatform[] = [
  "tiktok",
  "instagram",
  "facebook",
  "threads",
  "bluesky",
  "tumblr",
];

// State of the "All" batch queued on a video: pending waits for the worker,
// running is a claim held while it publishes, failed keeps the reason on the
// card so the admin can retry by hand.
export type AdminVideoScheduleStatus = "idle" | "pending" | "running" | "done" | "failed";

export type AdminVideoLibraryPublished = {
  tiktok: boolean;
  instagram: boolean;
  facebook: boolean;
  threads: boolean;
  bluesky: boolean;
  youtube: boolean;
  pinterest: boolean;
  tumblr: boolean;
};

// "publishing" is the in-flight state used by Threads; YouTube reports
// "uploading" while the file transfers and "scheduled" once YouTube holds it
// for a native status.publishAt release.
export type AdminVideoPublishState =
  | "idle"
  | "publishing"
  | "uploading"
  | "scheduled"
  | "published"
  | "failed";

// Direct Pinterest API publish. The old Instagram → Pinterest auto-sync never
// delivered pins, so Dreamly posts video pins itself to this board.
export const PINTEREST_DELIVERY: "auto-via-instagram" | "direct" = "direct";
export const PINTEREST_BOARD_NAME = "Dream Meanings & Interpretation";

export type AdminVideoLibraryItem = {
  id: string;
  title: string;
  topic: string;
  source: AdminVideoLibrarySource;
  sourceLabel: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  published: AdminVideoLibraryPublished;
  tiktokState: AdminVideoPublishState;
  tiktokError: string;
  threadsState: AdminVideoPublishState;
  threadsError: string;
  blueskyState: AdminVideoPublishState;
  blueskyError: string;
  blueskyUri: string;
  blueskyPostUrl: string;
  youtubeState: AdminVideoPublishState;
  youtubeError: string;
  youtubeVideoId: string;
  youtubeScheduledAt: string;
  pinterestState: AdminVideoPublishState;
  pinterestError: string;
  pinterestPinId: string;
  tumblrState: AdminVideoPublishState;
  tumblrError: string;
  tumblrPostId: string;
  tumblrPostUrl: string;
  tumblrBlogUrl: string;
  // The moment the whole "All" batch is due, shared by every queued platform.
  scheduledAt: string;
  scheduledPlatforms: AdminVideoPlatform[];
  scheduleStatus: AdminVideoScheduleStatus;
  scheduleError: string;
};

export function sourceLabelFor(source: AdminVideoLibrarySource) {
  return {
    free: "Free Video",
    "free-mix": "Free Mix",
    "sora-preview": "Sora 2 · Preview",
    "sora-standard": "Sora 2 · Slow",
    combined: "Combined",
    veo: "Video · Veo",
  }[source];
}
