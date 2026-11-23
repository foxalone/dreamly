import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { configuredAdMobUnit } from "@/lib/admobSsv";
import { petalRewardUnit } from "@/lib/petalSsv";
import { canReadFullAnalysis } from "@/lib/analysisTranslationAccess";
import { readFullSharedDreamAnalysis } from "@/lib/ensureSharedDreamAnalysis";
import { adRewardsLeftFor, canAnalyzeDream, hasPaidAccess } from "@/lib/subscriptions/status";
import { validRewardId } from "@/lib/rewardedReceipt";
import { translationAdTarget } from "@/lib/translationAdGrant";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { guestAdReward, hashIp, newGuestId, readClientIp, readGuestId, setGuestCookie } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { androidRewardTarget } from "../_lib/androidReward";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
    const petal = body.adProvider === "petal";
    const unit = petal ? petalRewardUnit() : configuredAdMobUnit();
    if (!unit || (petal && body.sessionId == null && body.rewardAction == null)) {
      return NextResponse.json({ code: "AD_UNAVAILABLE" }, { status: 503 });
    }
    let uid: string | null = null;
    if (body.idToken != null) {
      const auth = await requireSignedInUid(body.idToken);
      if ("error" in auth) return auth.error;
      uid = auth.uid;
    }
    const target = body.rewardAction == null ? null : androidRewardTarget(body);
    if (body.rewardAction != null && !target) {
      return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
    }
    const existingGuestId = uid ? null : readGuestId(req);
    const guestId = uid ? null : existingGuestId ?? (target && body.sessionId == null ? newGuestId() : null);
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
      const expired = session.state === "pending" ? session.adDeadlineMs < now
        : session.rewardTarget && session.redeemUntilMs < now;
      const state = expired ? "expired" : session.state;
      return NextResponse.json({ state });
    }

    if (target) {
      if (target.action !== "analysis") {
        const dream = (await db.collection("shared_dreams").doc(target.payload.sharedDreamId).get()).data();
        if (!dream || dream.deleted === true ||
            (target.action === "translation" && (typeof dream.text !== "string" || !dream.text.trim()))) {
          return NextResponse.json({ code: "NOT_PUBLIC" }, { status: 404 });
        }
        if (target.action === "reading" && !await readFullSharedDreamAnalysis(db, target.payload.sharedDreamId, dream)) {
          return NextResponse.json({ code: "NO_ANALYSIS" }, { status: 404 });
        }
        if (target.action === "analysisTranslation" && !await canReadFullAnalysis(db, target.payload.sharedDreamId, dream, uid, guestId)) {
          return NextResponse.json({ code: "READING_LOCKED" }, { status: 403 });
        }
      }
      const sessionId = randomUUID();
      await sessions.doc(sessionId).create({
        uid, guestId, unit, rewardTarget: { action: target.action, key: target.key },
        state: "pending", createdAtMs: now, adDeadlineMs: now + 15 * 60_000,
        expiresAt: Timestamp.fromMillis(now + 48 * 60 * 60_000),
      });
      const response = NextResponse.json({ state: "pending", sessionId, unit });
      return guestId && !existingGuestId ? setGuestCookie(response, guestId) : response;
    }

    const ip = readClientIp(req);
    const translation = translationAdTarget(body.sharedDreamId, body.targetLang);
    const attemptId = body.attemptId;
    if (body.kind === "translate") {
      if (!translation) return NextResponse.json({ code: "TRANSLATION_TARGET_REQUIRED" }, { status: 400 });
      const dream = (await db.collection("shared_dreams").doc(translation.sharedDreamId).get()).data();
      if (!dream || dream.deleted === true || typeof dream.text !== "string" || !dream.text.trim()) {
        return NextResponse.json({ code: "NOT_PUBLIC" }, { status: 404 });
      }
      if (uid) {
        const billing = (await db.collection("users").doc(uid).get()).data();
        if (hasPaidAccess(billing)) return NextResponse.json({ state: "ready" });
        if (adRewardsLeftFor(billing, "translate") === 0) {
          return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
        }
      } else if (guestId) {
        const { credits, leftToday } = await guestAdReward(guestId, ip, false, undefined, db, "translate", translation);
        if (credits > 0) return NextResponse.json({ state: "ready" });
        if (leftToday === 0) return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
      }
    } else {
      if (typeof attemptId !== "string" || !/^[0-9a-f]{64}$/.test(attemptId)) {
        return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
      }
      const attempt = (await db.collection("analysis_attempts").doc(attemptId).get()).data();
      if (!attempt || (attempt.uid ?? null) !== uid || (!uid && attempt.guestId !== guestId) ||
          attempt.source !== "android" || now - Number(attempt.updatedAtMs ?? 0) > 15 * 60_000 ||
          !["ad_required", "guest_free_limit", "network_free_limit", "daily_limit", "credits_required"].includes(attempt.reason)) {
        return NextResponse.json({ code: "AD_UNAVAILABLE" }, { status: 409 });
      }
      if (uid) {
        const billing = (await db.collection("users").doc(uid).get()).data();
        if (canAnalyzeDream(billing)) return NextResponse.json({ state: "ready" });
        if (hasPaidAccess(billing)) {
          return NextResponse.json({ code: "AD_DAILY_LIMIT" }, { status: 429 });
        }
      } else if (guestId) {
        const { credits } = await guestAdReward(guestId, ip);
        if (credits > 0) return NextResponse.json({ state: "ready" });
      }
    }

    const sessionId = randomUUID();
    await sessions.doc(sessionId).create({
      uid, guestId, networkHash: hashIp(ip), unit,
      ...(body.kind === "translate" ? { translation } : { attemptId }),
      state: "pending", createdAtMs: now, adDeadlineMs: now + 15 * 60_000,
      expiresAt: Timestamp.fromMillis(now + 48 * 60 * 60_000),
    });
    return NextResponse.json({ state: "pending", sessionId, unit });
  } catch {
    return NextResponse.json({ code: "AD_REWARD_FAILED" }, { status: 503 });
  }
}
