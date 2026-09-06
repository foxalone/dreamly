export const DREAM_LENSES = [
  "psychological",
  "spiritual",
  "islamic",
  "biblical",
  "hindu",
  "buddhist",
  "jewish",
] as const;

export type DreamLens = (typeof DREAM_LENSES)[number];

export const DEFAULT_DREAM_LENS: DreamLens = "psychological";
export const DREAM_LENS_STORAGE_KEY = "dreamly:analysisLens";

const LENS_SET = new Set<string>(DREAM_LENSES);

const LENS_PROMPT: Record<DreamLens, string> = {
  psychological:
    "Read the dream through a psychological lens: emotions, inner conflict, memory, and waking-life parallels. Do not diagnose.",
  spiritual:
    "Read the dream as a spiritual reflection: meaning, growth, and inner life. Do not claim prophecy or supernatural certainty.",
  islamic:
    "Read the dream in the spirit of classical Islamic dream interpretation (ta'bir), with humility. Do not present the reading as a fatwa, a ruling, or knowledge of the unseen. Distressing images are not omens.",
  biblical:
    "Read the dream through biblical and Christian symbolic language (scripture imagery, covenant, conscience). Do not treat the dream as a prophecy or a substitute for scripture, prayer, or pastoral counsel.",
  hindu:
    "Read the dream through Hindu symbolic and spiritual language (dharma, inner states, attachment and release). Do not claim a predictive omen or a religious ruling.",
  buddhist:
    "Read the dream through Buddhist themes (impermanence, attachment, mind-states, compassion). Do not claim prophecy or a doctrinal ruling.",
  jewish:
    "Read the dream through Jewish symbolic and biblical language, with humility. Do not present the reading as a rabbinic ruling, prophecy, or knowledge of the unseen.",
};

export function isDreamLens(value: unknown): value is DreamLens {
  return typeof value === "string" && LENS_SET.has(value);
}

export function parseDreamLens(value: unknown): DreamLens {
  return isDreamLens(value) ? value : DEFAULT_DREAM_LENS;
}

export function dreamLensPrompt(lens: DreamLens): string {
  return LENS_PROMPT[lens];
}

export function readStoredDreamLens(): DreamLens {
  try {
    return parseDreamLens(window.localStorage.getItem(DREAM_LENS_STORAGE_KEY));
  } catch {
    return DEFAULT_DREAM_LENS;
  }
}

export function writeStoredDreamLens(lens: DreamLens) {
  try {
    window.localStorage.setItem(DREAM_LENS_STORAGE_KEY, lens);
  } catch {
    // ignore quota / private mode
  }
}
