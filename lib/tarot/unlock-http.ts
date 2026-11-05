import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { adminAuth } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";
import { canReadTarotAccess, issueTarotUnlock, isTarotCardId, TAROT_ACCESS_COOKIE, TAROT_UNLOCK_COOKIE } from "./access";
import { TarotUnlockError, type TarotActor } from "./unlock";
import type { MajorArcanaId } from "./deck";

export const tarotResponseHeaders = { "Cache-Control": "private, no-store" };

export function tarotSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) throw new TarotUnlockError(503, "UNAVAILABLE");
  return secret;
}

export function checkTarotRequest(request: Request, secret: string, mutation: boolean) {
  const url = new URL(request.url), host = request.headers.get("host") ?? url.host;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(host)) throw new TarotUnlockError(403, "FORBIDDEN");
  const origin = new URL(`${url.protocol}//${host}`).origin;
  if (request.headers.get("x-tarot-request") !== "1" || request.headers.get("sec-fetch-site") === "cross-site" || (mutation && request.headers.get("origin") !== origin)) throw new TarotUnlockError(403, "FORBIDDEN");
  const network = process.env.VERCEL === "1"
    ? (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim()
    : "local";
  return network ? createHmac("sha256", secret).update(`tarot-ip:${network}`).digest("hex").slice(0, 32) : "unknown";
}

export async function tarotActor(request: Request): Promise<{ actor: TarotActor; guestId: string }> {
  const guestId = readGuestId(request);
  if (!guestId) throw new TarotUnlockError(403, "DRAW_REQUIRED");
  const authorization = request.headers.get("authorization");
  if (!authorization) return { actor: { guestId }, guestId };
  if (!authorization.startsWith("Bearer ")) throw new TarotUnlockError(401, "AUTH_REQUIRED");
  try { return { actor: { uid: (await adminAuth().verifyIdToken(authorization.slice(7))).uid }, guestId }; }
  catch { throw new TarotUnlockError(401, "AUTH_REQUIRED"); }
}

export function requireTarotDraw(request: Request, guestId: string, day: string, cardId: string, secret: string): MajorArcanaId {
  if (!isTarotCardId(cardId) || !canReadTarotAccess(cookieFromRequest(request, TAROT_ACCESS_COOKIE), guestId, day, cardId, secret)) throw new TarotUnlockError(403, "DRAW_REQUIRED");
  return cardId;
}

export function tarotUnlockResponse<T extends NextResponse>(response: T, guestId: string, day: string, cardId: MajorArcanaId, secret: string): T {
  response.cookies.set(TAROT_UNLOCK_COOKIE, issueTarotUnlock(guestId, day, cardId, secret), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    maxAge: Math.max(1, Math.ceil((Date.parse(`${day}T00:00:00Z`) + 86_400_000 - Date.now()) / 1000)),
  });
  return response;
}

export function tarotFailure(error: unknown) {
  const status = error instanceof TarotUnlockError ? error.status : error instanceof SyntaxError ? 400 : 503;
  return NextResponse.json({ error: error instanceof TarotUnlockError ? error.code : "UNAVAILABLE" }, { status, headers: tarotResponseHeaders });
}
