/**
 * Single source of truth for every OpenAI model the app uses.
 * Change a model HERE — deployment env vars no longer override these.
 *
 * The video workers (scripts/video-worker.mjs, scripts/ai-video-worker.mjs)
 * run on a separate machine and cannot import this file; each declares its
 * own OPENAI_MODEL constant at the top — keep them in sync by hand.
 */

/** Dream analysis shown to the user (homepage Ask). Quality-critical. */
export const DREAM_ANALYSIS_MODEL = "gpt-5-mini";

/** Emoji picks for dreams (journal, map, feed). */
export const DREAM_EMOJI_MODEL = "gpt-5-mini";

/** Symbolic root-word extraction + translation for the journal. */
export const ROOT_WORDS_MODEL = "gpt-5-mini";

/** Quick symbol lookup (FAB). Short, simple answers. */
export const QUICK_SYMBOL_MODEL = "gpt-5-nano";

/** Shared-dream translation in the feed. */
export const TRANSLATE_MODEL = "gpt-5-nano";

/** Tiny language-detection call at share time. */
export const DETECT_LANG_MODEL = "gpt-5-nano";
