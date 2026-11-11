/**
 * Single source of truth for every OpenAI model the app uses.
 * Change a model HERE — deployment env vars no longer override these.
 *
 * The video workers (scripts/video-worker.mjs, scripts/ai-video-worker.mjs)
 * run on a separate machine and cannot import this file; each declares its
 * own OPENAI_MODEL constant at the top — keep them in sync by hand.
 */

/** Dream analysis shown to the user (homepage Ask). Quality-critical. */
export const DREAM_ANALYSIS_MODEL = "gpt-5.6-terra";

/** Used only when the primary dream model is temporarily rate limited. */
export const DREAM_ANALYSIS_FALLBACK_MODEL = "gpt-5.6-luna";

/** Emoji picks for dreams (journal, map, feed). */
export const DREAM_EMOJI_MODEL = "gpt-5.6-terra";

/** Symbolic root-word extraction + translation for the journal. */
export const ROOT_WORDS_MODEL = "gpt-5.6-terra";

/** Quick symbol lookup (FAB). Short, simple answers. */
export const QUICK_SYMBOL_MODEL = "gpt-5.6-luna";

/** Shared-dream translation in the feed. */
export const TRANSLATE_MODEL = "gpt-5.6-terra";

/** Tiny language-detection call at share time. */
export const DETECT_LANG_MODEL = "gpt-5.6-luna";

/** Score how closely a comment responds to someone else's dream. */
export const COMMENT_XP_MODEL = "gpt-5.6-luna";

/** On-demand horoscope master and translations; unrelated translation models stay unchanged. */
export const HOROSCOPE_MODEL = "gpt-5.6-terra";

export const HOROSCOPE_TRANSLATE_MODEL = HOROSCOPE_MODEL;

/** One stored tarot interpretation per card, UTC day and supported language. */
export const TAROT_READING_MODEL = "gpt-5.6-terra";
