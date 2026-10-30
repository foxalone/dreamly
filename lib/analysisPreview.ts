import { cleanAnalysis } from "@/lib/publicDreamAnalysis";

/** How much of a public reading is visible before "more". Wide cards still fill two lines. */
export const ANALYSIS_PREVIEW_CHARS = 180;

/** Fields safe to store on the world-readable shared dream. The full text stays on the private dream. */
export function publicAnalysisFields(value: unknown):
  | { analysisText: string; analysisHasMore: boolean; analysisIsPreview: true }
  | Record<string, never> {
  const view = analysisPreview(cleanAnalysis(value));
  if (!view.preview) return {};
  return { analysisText: view.preview, analysisHasMore: view.hasMore, analysisIsPreview: true };
}

export function analysisPreview(value: string): { preview: string; hasMore: boolean } {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= ANALYSIS_PREVIEW_CHARS) return { preview: flat, hasMore: false };
  const cut = flat.slice(0, ANALYSIS_PREVIEW_CHARS);
  const space = cut.lastIndexOf(" ");
  const preview = (space > 80 ? cut.slice(0, space) : cut).trimEnd();
  return { preview, hasMore: preview.length < flat.length };
}
