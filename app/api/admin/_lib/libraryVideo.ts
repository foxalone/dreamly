import { AI_VIDEO_COLLECTION } from "@/lib/adminAiVideo";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";

export type LibraryVideo = {
  kind: "free" | "ai";
  jobId: string;
  collection: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  topic: string;
  hashtags: string;
  caption: string;
};

export function buildDreamCaption(title: string, topic: string, hashtags: string, maxLen = 2200) {
  const headline = String(title || topic || "Dream meaning").trim().slice(0, 120);
  const caption = hashtags
    ? `${headline}\n\n${hashtags}\n\nGet your dream meaning → link in bio`
    : `${headline}\n\nGet your dream meaning → link in bio\n#dreams #dreammeaning #dreamly`;
  return caption.slice(0, maxLen);
}

export async function loadLibraryVideo(libraryId: string, captionMaxLen = 2200): Promise<LibraryVideo> {
  const [kind, rawId] = libraryId.split(":");
  if (!rawId || (kind !== "free" && kind !== "ai")) {
    throw new Error("Invalid video id");
  }
  const collection = kind === "free" ? "adminVideoJobs" : AI_VIDEO_COLLECTION;
  const snapshot = await adminDb().collection(collection).doc(rawId).get();
  if (!snapshot.exists) throw new Error("Video not found");
  const data = snapshot.data() as {
    status?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    topic?: string;
    youtubeMetadata?: { title?: string; hashtags?: string[] };
  };
  const videoUrl = String(data.videoUrl || "");
  if (data.status !== "completed" || !videoUrl) throw new Error("Video is not ready");
  const title = String(data.youtubeMetadata?.title || data.topic || "Dreamly Short").trim();
  const hashtags = Array.isArray(data.youtubeMetadata?.hashtags)
    ? data.youtubeMetadata!.hashtags.map((tag) => `#${String(tag).replace(/^#/, "")}`).join(" ")
    : "";
  return {
    kind,
    jobId: rawId,
    collection,
    videoUrl,
    thumbnailUrl: String(data.thumbnailUrl || ""),
    title,
    topic: String(data.topic || ""),
    hashtags,
    caption: buildDreamCaption(title, String(data.topic || ""), hashtags, captionMaxLen),
  };
}
