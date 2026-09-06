import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { isLocaleExemptPath, stripLocalePrefix } from "@/lib/i18n/path";

const CANONICAL_HOST = "dreamly.art";

/**
 * Next.js 16 request proxy (replaces middleware.ts — the two files cannot coexist).
 * 1) Force apex host (www → dreamly.art).
 * 2) Collapse /en/... to unprefixed English URLs.
 * 3) Stamp the active locale on the request + cookie.
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

  const { pathname } = request.nextUrl;
  if (isLocaleExemptPath(pathname)) return NextResponse.next();

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/en" ? "/" : pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const { locale } = stripLocalePrefix(pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dreamly-locale", locale || DEFAULT_LOCALE);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("dreamly-locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-|apple-icon|manifest|.*\\..*).*)"],
};
