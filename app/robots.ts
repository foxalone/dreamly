import type { MetadataRoute } from "next";

const SITE = "https://dreamly.art";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/signin",
          "/app/dreams",
          "/app/chat",
          "/app/profile",
          "/app/profile/admin-dashboard",
          "/app/tiktok-studio",
          "/app/upgrade",
          "/payment-success",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
