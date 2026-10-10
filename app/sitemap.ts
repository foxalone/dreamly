import type { MetadataRoute } from "next";
import { listDreamPageImageUrls } from "@/lib/getDreamPageImage";
import { listPublicPages, SITE_ORIGIN } from "@/lib/publicPages";
import { adminFirestore } from "@/lib/firebaseAdmin";

/** Next.js writes image:loc as raw text; unescaped `&` in Storage URLs makes the XML invalid for GSC. */
function xmlSafeImageUrl(url: string): string {
  return url.replace(/&/g, "&amp;");
}

export const revalidate = 3600;

/**
 * Public dream pages (/dream/<id>) — every shared, not-deleted dream has a
 * permanent id and its own indexable page. Newest 1000 keep the sitemap small;
 * older dreams stay indexed through the pages Google already crawled.
 */
async function sharedDreamPages(): Promise<MetadataRoute.Sitemap> {
  try {
    const snap = await adminFirestore()
      .collection("shared_dreams")
      .orderBy("sharedAtMs", "desc")
      .limit(1000)
      .get();

    return snap.docs
      .filter((d) => {
        const data = d.data() as any;
        return data?.deleted !== true && String(data?.text ?? "").trim().length > 0;
      })
      .map((d) => {
        const ms = Number((d.data() as any)?.sharedAtMs);
        return {
          url: `${SITE_ORIGIN}/dream/${d.id}`,
          ...(Number.isFinite(ms) && ms > 0 ? { lastModified: new Date(ms) } : {}),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        };
      });
  } catch (e) {
    // no admin credentials (local build) or a Firestore hiccup — the static
    // pages still make a valid sitemap
    console.error("sitemap: shared dream pages failed:", e);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [imageBySlug, dreamPages] = await Promise.all([
    listDreamPageImageUrls(),
    sharedDreamPages(),
  ]);

  const staticPages = listPublicPages().map((page) => {
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

  return [...staticPages, ...dreamPages];
}
