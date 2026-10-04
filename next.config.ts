import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";

function resolveBuildCommit(): string {
  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
  if (/^[a-f0-9]{40}$/i.test(deploymentSha)) return deploymentSha.toLowerCase();
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[a-f0-9]{40}$/i.test(sha) ? sha.toLowerCase() : "";
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  // Next embeds this SHA into the client bundle, identifying the installed build.
  env: { NEXT_PUBLIC_BUILD_COMMIT: resolveBuildCommit() },
  // Allows CI/sandbox builds to write to an alternate dist dir (defaults to .next).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  async rewrites() {
    // IndexNow key verification: serve /{INDEXNOW_KEY}.txt from the env var (see app/api/indexnow/key).
    // Same validation as INDEXNOW_KEY_PATTERN in lib/indexnow.ts; kept inline so the config stays dependency-free.
    const indexNowKey = (process.env.INDEXNOW_KEY || "").trim();
    const beforeFiles = /^[a-zA-Z0-9-]{8,128}$/.test(indexNowKey)
      ? [{ source: `/${indexNowKey}.txt`, destination: "/api/indexnow/key" }]
      : [];
    return { beforeFiles, afterFiles: [], fallback: [] };
  },

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
      {
        source: "/:locale(es|ar|pt|de|ru)/app",
        destination: "/:locale/app/dreams",
        permanent: true,
      },
      // Trailing-slash strip lands on a 404; send category index to the dictionary hub.
      {
        source: "/dreams/categories",
        destination: "/dreams",
        permanent: true,
      },
      {
        source: "/:locale(es|ar|pt|de|ru)/dreams/categories",
        destination: "/:locale/dreams",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
