import type { MetadataRoute } from "next";

const SITE = "https://dreamly.art";

export default function robots(): MetadataRoute.Robots {
  // Do not Disallow private URLs. A robots.txt block stops Google from seeing
  // the noindex tag, which is how a URL stays "Indexed, though blocked by
  // robots.txt" (GSC 2026-11-10). Sign-in, payment, auth, ads, and /app
  // (except /app/map) send noindex instead, so a recrawl can drop them.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
