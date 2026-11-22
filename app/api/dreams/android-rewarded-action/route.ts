import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readingUnlockPath } from "@/lib/analysisTranslationAccess";
import { validRewardId } from "@/lib/rewardedReceipt";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { androidRewardTarget, AndroidRewardRequest } from "../_lib/androidReward";
import { readGuestId } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";
import { POST as analyze } from "../analyze/route";
import { POST as readAnalysis } from "../read-analysis/route";
import { POST as translate } from "../translate/route";
import { POST as translateAnalysis } from "../translate-analysis/route";

export const runtime = "nodejs";
export const maxDuration = 120;

const handlers = { analysis: analyze, reading: readAnalysis, translation: translate, analysisTranslation: translateAnalysis };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const target = body && typeof body === "object" ? androidRewardTarget(body) : null;
    if (!target || !validRewardId(body?.sessionId)) {
      return NextResponse.json({ code: "AD_REQUIRED" }, { status: 402 });
    }
    const auth = body.idToken ? await requireSignedInUid(body.idToken) : null;
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid ?? null;
    const guestId = uid ? null : readGuestId(req);
    if (!uid && !guestId) return NextResponse.json({ code: "AD_REQUIRED" }, { status: 402 });

    const db = adminDb();
    const ref = db.collection("androidAnalysisRewards").doc(body.sessionId);
    const claimId = randomUUID();
    const claim = await db.runTransaction(async (tx) => {
      const data = (await tx.get(ref)).data();
      const now = Date.now();
      if (!data || data.uid !== uid || data.guestId !== guestId || data.rewardTarget?.action !== target.action ||
          data.rewardTarget.key !== target.key || typeof data.redeemUntilMs !== "number" || data.redeemUntilMs < now) {
        return { state: "denied" } as const;
      }
      if (data.state === "redeemed") {
        return { state: "cached", json: data.response as string, attemptId: data.attemptId as string } as const;
      }
      if (data.state === "redeeming" && data.claimUntilMs > now) return { state: "busy" } as const;
      if (data.state !== "granted" && data.state !== "redeeming") return { state: "denied" } as const;
      tx.update(ref, { state: "redeeming", claimId, claimUntilMs: now + (maxDuration + 15) * 1000 });
      return { state: "claimed" } as const;
    });
    if (claim.state === "denied") return NextResponse.json({ code: "AD_REQUIRED" }, { status: 402 });
    if (claim.state === "busy") return NextResponse.json({ code: "AD_CONFIRMATION_PENDING" }, { status: 409 });
    async function rememberReadingUnlock(id: string) {
      const viewer = uid ? { uid } : guestId ? { guestId } : null;
      if (!viewer) return;
      const unlock = db.doc(readingUnlockPath(id, viewer));
      await db.runTransaction(async (tx) => {
        if (!(await tx.get(unlock)).exists) {
          tx.create(unlock, { sharedDreamId: id, atMs: Date.now(), source: "rewarded_ad" });
        }
      });
    }
    if (claim.state === "cached") {
      if (target.action === "reading") await rememberReadingUnlock(target.payload.sharedDreamId);
      const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
      if (claim.attemptId) headers.set("X-Dreamly-Attempt", claim.attemptId);
      return new Response(claim.json, { headers });
    }
    let response: Response | undefined;
    let json = "";
    try {
      response = await handlers[target.action](new AndroidRewardRequest(req.url, {
        method: "POST", headers: req.headers,
        body: JSON.stringify({ ...target.payload, ...(uid ? { idToken: body.idToken } : {}) }),
      }));
      if (response.ok) {
        if (target.action === "reading") await rememberReadingUnlock(target.payload.sharedDreamId);
        json = await response.clone().text();
      }
    } finally {
      await db.runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.claimId !== claimId) return;
        tx.update(ref, json ? {
          state: "redeemed", claimId: "", response: json, attemptId: response?.headers.get("X-Dreamly-Attempt") ?? "",
        } : { state: "granted", claimId: "", claimUntilMs: 0 });
      });
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ code: "AD_REWARD_FAILED" }, { status: 503 });
  }
}
