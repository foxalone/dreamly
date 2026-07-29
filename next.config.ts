import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows CI/sandbox builds to write to an alternate dist dir (defaults to .next).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  async redirects() {
    return [
      // Canonical host: www → apex (belt-and-suspenders; Vercel domain redirect should also do this).
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.dreamly.art" }],
        destination: "https://dreamly.art/:path*",
        permanent: true,
      },
      // Soft 307 from app/app/page.tsx was showing up as "Page with redirect" in GSC.
      // Permanent 308 + homepage CTAs pointing at /app/dreams stop the soft redirect chain.
      {
        source: "/app",
        destination: "/app/dreams",
        permanent: true,
      },
      // Trailing-slash strip lands on a 404; send category index to the dictionary hub.
      {
        source: "/dreams/categories",
        destination: "/dreams",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
