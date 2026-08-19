export type AdminVideoLibrarySource = "free" | "sora-preview" | "sora-standard" | "combined" | "veo";

export type AdminVideoLibraryPublished = {
  tiktok: boolean;
  instagram: boolean;
  facebook: boolean;
  threads: boolean;
  youtube: boolean;
  pinterest: boolean;
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
  threadsState: AdminVideoPublishState;
  threadsError: string;
  youtubeState: AdminVideoPublishState;
  youtubeError: string;
  youtubeVideoId: string;
  youtubeScheduledAt: string;
  pinterestState: AdminVideoPublishState;
  pinterestError: string;
  pinterestPinId: string;
};

export function sourceLabelFor(source: AdminVideoLibrarySource) {
  return {
    free: "Free Video",
    "sora-preview": "Sora 2 · Preview",
    "sora-standard": "Sora 2 · Slow",
    combined: "Combined",
    veo: "Video · Veo",
  }[source];
}
