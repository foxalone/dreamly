/** Keep an analysis translation reward separate from the dream text translation. */
export function analysisTranslationTargetId(sharedDreamId: string) {
  return `analysis:${sharedDreamId}`;
}
