import { createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { newGuestId, readGuestId, setGuestCookie } from "@/app/api/dreams/_lib/guestQuota";
import { cookieFromRequest } from "@/lib/horoscope/access-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(host) || request.headers.get("origin") !== `${protocol}//${host}` || request.headers.get("x-love-match-request") !== "1" || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers });
  }
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 512) throw new Error("Too long");
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers }); }

  const guestId = readGuestId(request) ?? newGuestId();
  try {
    const db = adminDb();
    if (body.action === "start") {
      if (Object.keys(body).some(key => key !== "action")) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
      const secret = process.env.GUEST_IP_SALT?.trim() || process.env.CRON_SECRET?.trim();
      if (!secret) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
      const network = process.env.VERCEL === "1"
        ? (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim() || "unknown"
        : "local";
      const day = new Date().toISOString().slice(0, 10);
      const bucket = createHmac("sha256", secret).update(`love-ad:${network}:${day}`).digest("hex");
      const usageBucket = createHmac("sha256", secret).update(`love-match:${network}:${day}`).digest("hex");
      const challenge = randomUUID(), now = Date.now();
      const entitlementAtStart = cookieFromRequest(request, "FCOEC") || "";
      const allowed = await db.runTransaction(async transaction => {
        const ref = db.collection("loveMatchAdLimits").doc(bucket);
        const usageRef = db.collection("loveMatchDailyLimits").doc(usageBucket);
        const [snapshot, usage] = await Promise.all([transaction.get(ref), transaction.get(usageRef)]);
        if (Number(usage.data()?.count ?? 0) >= 10) return "daily";
        const count = Number(snapshot.data()?.count ?? 0);
        if (count >= 20) return "starts";
        transaction.set(ref, { count: count + 1, day, updatedAt: now }, { merge: true });
        transaction.set(db.collection("loveMatchAdChallenges").doc(challenge), {
          guestId, createdAt: now, expiresAt: now + 10 * 60_000, completed: false, used: false, entitlementAtStart,
        });
        return "ok";
      });
      if (allowed !== "ok") return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers });
      return setGuestCookie(NextResponse.json({ challenge }, { headers }), guestId);
    }
    if (body.action !== "complete" || typeof body.challenge !== "string" || !/^[0-9a-f-]{36}$/.test(body.challenge) || Object.keys(body).some(key => !["action", "challenge"].includes(key))) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
    }
    const entitlement = cookieFromRequest(request, "FCOEC");
    if (!readGuestId(request) || !entitlement) return NextResponse.json({ error: "AD_NOT_COMPLETED" }, { status: 403, headers });
    const completed = await db.runTransaction(async transaction => {
      const ref = db.collection("loveMatchAdChallenges").doc(body.challenge as string);
      const snapshot = await transaction.get(ref);
      const data = snapshot.data();
      if (!data || data.guestId !== guestId || data.expiresAt <= Date.now() || data.used || data.entitlementAtStart === entitlement) return false;
      transaction.set(ref, { completed: true, completedAt: Date.now() }, { merge: true });
      return true;
    });
    return NextResponse.json(completed ? { unlocked: true } : { error: "AD_CHALLENGE_INVALID" }, { status: completed ? 200 : 403, headers });
  } catch { return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers }); }
}
