import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows CI/sandbox builds to write to an alternate dist dir (defaults to .next).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
