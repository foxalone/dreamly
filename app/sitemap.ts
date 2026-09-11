import type { MetadataRoute } from "next";
import { listDreamPageImageUrls } from "@/lib/getDreamPageImage";
import { listPublicPages } from "@/lib/publicPages";

/** Next.js writes image:loc as raw text; unescaped `&` in Storage URLs makes the XML invalid for GSC. */
function xmlSafeImageUrl(url: string): string {
  return url.replace(/&/g, "&amp;");
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const imageBySlug = await listDreamPageImageUrls();

  return listPublicPages().map((page) => {
    const imageUrl =
      (page.slug && imageBySlug.get(page.slug)) ||
      (page.canonicalSlug && imageBySlug.get(page.canonicalSlug)) ||
      undefined;
    return {
      url: page.url,
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      ...(imageUrl ? { images: [xmlSafeImageUrl(imageUrl)] } : {}),
    };
  });
}
