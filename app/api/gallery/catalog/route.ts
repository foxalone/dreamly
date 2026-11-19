import { NextResponse } from "next/server";
import { listDreamPageImages } from "@/lib/getDreamPageImage";
import { galleryThumbUrl, sortDreamPageImages } from "@/lib/dreamPageImage";
import { isLocale } from "@/lib/i18n/config";
import { getLocalizedEntry } from "@/lib/i18n/localize-dictionary";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("lang");
  const locale = isLocale(requested) ? requested : "en";
  const assignments = await listDreamPageImages(true).catch(() => null);
  if (assignments === null) {
    return NextResponse.json({ error: "Gallery unavailable" }, { status: 503 });
  }
  const images = sortDreamPageImages(assignments).flatMap((image) => {
    const entry = getLocalizedEntry(image.slug, locale);
    if (!entry) return [];
    return [{
      slug: image.slug,
      title: entry.title,
      meaning: entry.shortMeaning,
      thumb: galleryThumbUrl(image, 480),
      imageUrl: image.imageUrl,
    }];
  });
  return NextResponse.json({ images }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
