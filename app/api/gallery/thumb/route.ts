import { NextResponse } from "next/server";
import { readDreamPageImageAssignment } from "@/lib/getDreamPageImage";
import { galleryThumbVersion, parseGalleryThumbWidth } from "@/lib/dreamPageImage";

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
  try {
    imageUrl = (await readDreamPageImageAssignment(slug))?.imageUrl || "";
  } catch {
    return NextResponse.json({ error: "Lookup failed" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!imageUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=300" } });
  }

  const fresh = params.get("v") === galleryThumbVersion(imageUrl);
  try {
    const source = await fetch(imageUrl, { cache: "no-store" });
    if (!source.ok) throw new Error(`source ${source.status}`);
    const input = Buffer.from(await source.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();
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
