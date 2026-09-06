import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isPrefixLocale } from "@/lib/i18n/config";
import { isLocaleExemptPath, stripLocalePrefix } from "@/lib/i18n/path";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isLocaleExemptPath(pathname)) return NextResponse.next();

  // Collapse /en/... back to unprefixed English URLs.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/en" ? "/" : pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const { locale } = stripLocalePrefix(pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dreamly-locale", locale || DEFAULT_LOCALE);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set("dreamly-locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-|apple-icon|manifest).*)"],
};
