import { unstable_cache } from "next/cache";
import sharp from "sharp";
import { readDreamPageImageAssignment } from "./getDreamPageImage";
import { galleryThumbVersion, type GalleryThumbWidth } from "./dreamPageImage";

const YEAR = 60 * 60 * 24 * 365;

export class MissingGalleryImage extends Error {}
export class ChangedGalleryImage extends Error {
  constructor(public readonly imageUrl: string) {
    super("The requested thumbnail version is no longer current");
  }
}

// Only a verified version is cached. Unknown/missing versions must still check
// the current assignment, rather than pinning an arbitrary URL for a year.
export const resolveVersionedGalleryImage = unstable_cache(
  async (slug: string, version: string): Promise<string> => {
    const imageUrl = (await readDreamPageImageAssignment(slug))?.imageUrl;
    if (!imageUrl) throw new MissingGalleryImage();
    if (version !== galleryThumbVersion(imageUrl)) throw new ChangedGalleryImage(imageUrl);
    return imageUrl;
  },
  ["gallery-image-version-v1"],
  { revalidate: YEAR },
);

async function downloadImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`source ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Coalesce concurrent clients/sizes while the durable thumbnail cache fills. */
export function createGalleryThumbnailRenderer(download = downloadImage) {
  const sources = new Map<string, Promise<Buffer>>();
  const thumbnails = new Map<string, Promise<Buffer>>();
  return function render(imageUrl: string, width: GalleryThumbWidth): Promise<Buffer> {
    const key = JSON.stringify([imageUrl, width]);
    const existing = thumbnails.get(key);
    if (existing) return existing;
    const task = (async () => {
      let source = sources.get(imageUrl);
      if (!source) {
        source = download(imageUrl).finally(() => sources.delete(imageUrl));
        sources.set(imageUrl, source);
      }
      return sharp(await source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 72, effort: 4 })
        .toBuffer();
    })().finally(() => thumbnails.delete(key));
    thumbnails.set(key, task);
    return task;
  };
}

const renderThumbnail = createGalleryThumbnailRenderer();

// Next's Data Cache survives requests and deployment instances on supported
// hosts. Base64 keeps the small WebP serializable; full-size PNGs aren't stored.
export const getCachedGalleryThumbnail = unstable_cache(
  async (imageUrl: string, width: GalleryThumbWidth): Promise<string> =>
    (await renderThumbnail(imageUrl, width)).toString("base64"),
  ["gallery-webp-72-v1"],
  { revalidate: YEAR },
);
