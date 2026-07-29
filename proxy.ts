import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "dreamly.art";

/**
 * Force apex host (www → dreamly.art). Vercel domain redirects usually handle this
 * first; this is a code-level fallback so crawlers never get duplicate www HTML.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host === `www.${CANONICAL_HOST}`) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip Next internals and static assets; run on all pages/API that could
     * otherwise be served under www.
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
