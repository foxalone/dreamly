import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { configuredAdMobUnit } from "@/lib/admobSsv";
import { adRewardsLeftToday, canAnalyzeDream, hasPaidAccess } from "@/lib/subscriptions/status";
import { validRewardId } from "@/lib/rewardedReceipt";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { guestAdReward, hashIp, readClientIp, readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export async function POST(req: Request) {
  const unit = configuredAdMobUnit();
  if (!unit) return NextResponse.json({ code: "AD_UNAVAILABLE" }, { status: 503 });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
    let uid: string | null = null;
    if (body.idToken != null) {
      const auth = await requireSignedInUid(body.idToken);
      if ("error" in auth) return auth.error;
      uid = auth.uid;
    }
    const guestId = uid ? null : readGuestId(req);
    if (!uid && !guestId) return NextResponse.json({ code: "GUEST_REQUIRED" }, { status: 401 });
    const db = adminDb();
    const sessions = db.collection("androidAnalysisRewards");
    const now = Date.now();

    if (body.sessionId != null) {
      if (!validRewardId(body.sessionId)) return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
      const session = (await sessions.doc(body.sessionId).get()).data();
      if (!session || session.uid !== uid || session.guestId !== guestId) {
        return NextResponse.json({ code: "AD_SESSION_NOT_FOUND" }, { status: 404 });
      }
      const state = session.state === "pending" && session.adDeadlineMs < now ? "expired" : session.state;
      return NextResponse.json({ state });
    }

    const attemptId = body.attemptId;
    if (typeof attemptId !== "string" || !/^[0-9a-f]{64}$/.test(attemptId)) {
      return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
    }
    const attempt = (await db.collection("analysis_attempts").doc(attemptId).get()).data();
    if (!attempt || (attempt.uid ?? null) !== uid || (!uid && attempt.guestId !== guestId) ||
        attempt.source !== "android" || now - Number(attempt.updatedAtMs ?? 0) > 15 * 60_000 ||
        !["ad_required", "guest_free_limit", "network_free_limit", "daily_limit", "credits_required"].includes(attempt.reason)) {
      return NextResponse.json({ code: "AD_UNAVAILABLE" }, { status: 409 });
    }

    const ip = readClientIp(req);
    if (uid) {
      const billing = (await db.collection("users").doc(uid).get()).data();
      if (canAnalyzeDream(billing)) return NextResponse.json({ state: "ready" });
      if (hasPaidAccess(billing) || adRewardsLeftToday(billing) === 0) {
        return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
      }
    } else if (guestId) {
      const { credits, leftToday } = await guestAdReward(guestId, ip);
      if (credits > 0) return NextResponse.json({ state: "ready" });
      if (leftToday === 0) return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
    }

    const sessionId = randomUUID();
    await sessions.doc(sessionId).create({
      uid, guestId, networkHash: hashIp(ip), attemptId, unit,
      state: "pending", createdAtMs: now, adDeadlineMs: now + 15 * 60_000,
      expiresAt: Timestamp.fromMillis(now + 48 * 60 * 60_000),
    });
    return NextResponse.json({ state: "pending", sessionId, unit });
  } catch {
    return NextResponse.json({ code: "AD_REWARD_FAILED" }, { status: 503 });
  }
}
