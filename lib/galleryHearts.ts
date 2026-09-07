export const GALLERY_HEARTS_COLLECTION = "gallery_hearts";
export const USER_GALLERY_HEARTS_COLLECTION = "galleryHearts";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeGalleryHeartSlug(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidGalleryHeartSlugFormat(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_RE.test(slug);
}

export function safeHeartCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
