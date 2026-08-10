export type AdminVideoLibrarySource = "free" | "sora-preview" | "sora-standard" | "combined" | "veo";

export type AdminVideoLibraryItem = {
  id: string;
  title: string;
  topic: string;
  source: AdminVideoLibrarySource;
  sourceLabel: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: string;
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
