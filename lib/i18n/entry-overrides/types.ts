import type { DreamSections } from "@/lib/dream-dictionary";

/**
 * Native, hand-written content for one dictionary entry in one locale.
 * Anything set here replaces the generated template output for that locale only.
 */
export type EntryL10nOverride = {
  seoTitle?: string;
  seoDescription?: string;
  sections?: Partial<DreamSections>;
};
