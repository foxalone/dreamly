export const DICTIONARY_VIDEO_QUEUE_COLLECTION = "adminDictionaryVideoQueue";
export type DictionaryVideoState = "idle" | "queued" | "completed";

export function dictionaryVideoState(requested: boolean, video?: { status?: string; videoUrl?: string } | null): DictionaryVideoState {
  if (video?.status === "completed" && video.videoUrl) return "completed";
  return requested || Boolean(video) ? "queued" : "idle";
}
