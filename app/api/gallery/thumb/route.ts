import { NextResponse } from "next/server";
import { parseGalleryThumbWidth } from "@/lib/dreamPageImage";
import {
  ChangedGalleryImage,
  MissingGalleryImage,
  getCachedGalleryThumbnail,
  resolveVersionedGalleryImage,
} from "@/lib/galleryThumbnail";

export const runtime = "nodejs";
export const maxDuration = 30;

const YEAR = 60 * 60 * 24 * 365;

/**
 * Small WebP of a gallery image (see GALLERY_THUMB_WIDTHS). Only slugs with an
 * assigned dream-page image are served, never arbitrary URLs. When `v` matches
 * the current image the response is immutable for a year on the CDN; a stale
 * `v` (page HTML older than the image) gets the new image with a short TTL.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = (params.get("slug") || "").trim();
  const width = parseGalleryThumbWidth(params.get("w"));
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  let imageUrl = "";
  let fresh = true;
  try {
    imageUrl = await resolveVersionedGalleryImage(slug, params.get("v") || "");
  } catch (error) {
    if (error instanceof ChangedGalleryImage) {
      imageUrl = error.imageUrl;
      fresh = false;
    } else if (error instanceof MissingGalleryImage) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=300" } });
    } else {
      return NextResponse.json({ error: "Lookup failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }

  try {
    const output = Buffer.from(await getCachedGalleryThumbnail(imageUrl, width), "base64");
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(output.length),
        "Cache-Control": fresh
          ? `public, max-age=${YEAR}, s-maxage=${YEAR}, immutable`
          : "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("[gallery/thumb]", slug, error instanceof Error ? error.message : error);
    // Never leave a hole in the grid: fall back to the full-size original.
    return NextResponse.redirect(imageUrl, { status: 302, headers: { "Cache-Control": "no-store" } });
  }
}
