/** Keep a comment's ad reward and translation unlock separate from its dream. */
export function commentTranslationTargetId(dreamId: string, commentId: string) {
  return `comment:${dreamId}:${commentId}`;
}
