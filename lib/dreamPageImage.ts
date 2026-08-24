export const DREAM_PAGE_IMAGE_COLLECTION = "dreamPageImages";

/** Matches the current Sora/gpt-image portrait output used by the image worker. */
export const DREAM_PAGE_IMAGE_WIDTH = 1024;
export const DREAM_PAGE_IMAGE_HEIGHT = 1536;

export type DreamPageImageAssignment = {
  slug: string;
  imageJobId: string;
  imageUrl: string;
  subject: string;
  alt: string;
};

export function dreamPageImageAlt(symbolName: string) {
  const name = symbolName.trim();
  if (!name) return "Dream symbol illustration";
  return `Illustration of ${name} as a dream symbol`;
}
