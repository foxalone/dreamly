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
  assignedAt: string;
};

export function sortDreamPageImages(items: DreamPageImageAssignment[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.assignedAt) || 0;
    const bTime = Date.parse(b.assignedAt) || 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.slug.localeCompare(b.slug);
  });
}

export function dreamPageImageAlt(symbolName: string) {
  const name = symbolName.trim();
  if (!name) return "Dream symbol illustration";
  return `Illustration of ${name} as a dream symbol`;
}

/**
 * Gallery thumbnails. The stored images are full-size 1024×1536 PNGs (≈2 MB);
 * a gallery card is ~190–280 CSS px wide, so phones were downloading 10–30× more
 * than they could show. /api/gallery/thumb re-encodes them to small WebPs and the
 * CDN keeps each one for a year — the `v` hash changes whenever the image does.
 */
export const GALLERY_THUMB_WIDTHS = [320, 480, 640] as const;
export type GalleryThumbWidth = (typeof GALLERY_THUMB_WIDTHS)[number];
export const GALLERY_THUMB_DEFAULT_WIDTH: GalleryThumbWidth = 480;
/** 2 columns on phones, 3 from sm (640px), 4 from lg inside max-w-6xl (≈270px). */
export const GALLERY_THUMB_SIZES = "(min-width: 1024px) 270px, (min-width: 640px) 31vw, 48vw";

/** Short, stable FNV-1a hash of the source URL: the cache-busting version of a thumbnail. */
export function galleryThumbVersion(imageUrl: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < imageUrl.length; index += 1) {
    hash ^= imageUrl.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Snap any requested width to the allowed set so the endpoint can't be used to mint arbitrary sizes. */
export function parseGalleryThumbWidth(raw: string | null | undefined): GalleryThumbWidth {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return GALLERY_THUMB_DEFAULT_WIDTH;
  return GALLERY_THUMB_WIDTHS.find((width) => width >= value) ?? GALLERY_THUMB_WIDTHS[GALLERY_THUMB_WIDTHS.length - 1];
}

export function galleryThumbUrl(image: Pick<DreamPageImageAssignment, "slug" | "imageUrl">, width: GalleryThumbWidth) {
  const params = new URLSearchParams({ slug: image.slug, w: String(width), v: galleryThumbVersion(image.imageUrl) });
  return `/api/gallery/thumb?${params.toString()}`;
}

export function galleryThumbSrcSet(image: Pick<DreamPageImageAssignment, "slug" | "imageUrl">) {
  return GALLERY_THUMB_WIDTHS.map((width) => `${galleryThumbUrl(image, width)} ${width}w`).join(", ");
}
