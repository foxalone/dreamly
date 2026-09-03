import { NextResponse } from "next/server";
import { completeTumblrOAuthCallback } from "@/app/api/admin/tumblr/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWith(request: Request, status: "connected" | "error", detail = "") {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "dreamly.art";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const url = new URL("/app/profile/admin-dashboard", `${proto}://${host}`);
  url.searchParams.set("tab", "CONNECTIONS");
  url.searchParams.set("tumblr", status);
  if (detail) url.searchParams.set("tumblr_error", detail.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  try {
    const incoming = new URL(request.url);
    // Tumblr sends error=access_denied when the admin refuses the app.
    const error = incoming.searchParams.get("error");
    if (error) {
      const description = incoming.searchParams.get("error_description") || error;
      return redirectWith(request, "error", description);
    }

    const code = incoming.searchParams.get("code");
    const state = incoming.searchParams.get("state");
    if (!code || !state) {
      return redirectWith(request, "error", "Missing OAuth code or state");
    }

    await completeTumblrOAuthCallback(code, state);
    return redirectWith(request, "connected");
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    console.error("[admin/tumblr/callback]", message);
    return redirectWith(request, "error", message);
  }
}
