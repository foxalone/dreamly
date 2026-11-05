import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { newGuestId, readGuestId, setGuestCookie } from "@/app/api/dreams/_lib/guestQuota";
import { dailyDraw } from "@/lib/tarot/dailyDraw";
import { issueTarotAccess, TAROT_ACCESS_COOKIE } from "@/lib/tarot/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = { "Cache-Control": "private, no-store" };

function requestContext(request: Request, secret: string): { allowed: boolean; ipBucket: string | null } {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(host)) return { allowed: false, ipBucket: null };
  const expectedOrigin = new URL(`${url.protocol}//${host}`).origin;
  if (
    request.headers.get("origin") !== expectedOrigin ||
    request.headers.get("x-tarot-request") !== "1" ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) return { allowed: false, ipBucket: null };

  // Only trust Vercel's forwarding header in production. Local requests share a test bucket.
  const network = process.env.VERCEL === "1"
    ? (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim()
    : "local";
  return {
    allowed: true,
    ipBucket: network ? createHmac("sha256", secret).update(`tarot-ip:${network}`).digest("hex").slice(0, 32) : null,
  };
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers: responseHeaders });
  const { allowed, ipBucket } = requestContext(request, secret);
  if (!allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: responseHeaders });

  const authorization = request.headers.get("authorization");
  let uid: string | null = null;
  if (authorization) {
    if (!authorization.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers: responseHeaders });
    try {
      uid = (await adminAuth().verifyIdToken(authorization.slice(7))).uid;
    } catch {
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers: responseHeaders });
    }
  }

  const existingGuestId = readGuestId(request);
  const guestId = existingGuestId ?? newGuestId();
  try {
    const result = await dailyDraw(adminDb(), { uid, guestId, ipBucket }, secret);
    const response = NextResponse.json(result, { headers: responseHeaders });
    response.cookies.set(TAROT_ACCESS_COOKIE, issueTarotAccess(guestId, result.day, result.cardId, secret), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.max(1, Math.ceil((Date.parse(`${result.day}T00:00:00Z`) + 86_400_000 - Date.now()) / 1000)),
    });
    return existingGuestId ? response : setGuestCookie(response, guestId);
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers: responseHeaders });
  }
}
