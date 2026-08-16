export type AdminVideoLibrarySource = "free" | "sora-preview" | "sora-standard" | "combined" | "veo";

export type AdminVideoLibraryPublished = {
  tiktok: boolean;
  instagram: boolean;
  facebook: boolean;
  threads: boolean;
  youtube: boolean;
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

// Pinterest is not published by Dreamly. The board below is fed automatically by
// the external Instagram -> Pinterest connection, so the admin UI only reports
// the expected reach and never offers a direct publish action (that would double
// post). Flip to "direct" only if a real Pinterest API integration is added.
export const PINTEREST_DELIVERY: "auto-via-instagram" | "direct" = "auto-via-instagram";
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
