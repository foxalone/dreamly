import { adMobTimestampMs, configuredAdMobUnit, verifyAdMobCallback } from "@/lib/admobSsv";
import { validRewardId } from "@/lib/rewardedReceipt";
import { adminDb } from "../../../admin/_lib/firebaseAdmin";
import { recordAttemptAccess } from "../../_lib/analysisAttempts";
import { guestAdRewardForNetwork } from "../../_lib/guestQuota";
import { grantAdReward } from "../../_lib/subscription";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const unit = configuredAdMobUnit();
  if (!unit) return new Response(null, { status: 503 });
  try {
    const params = await verifyAdMobCallback(req.url);
    if (!params) return new Response(null, { status: 400 });
    const adUnit = params.get("ad_unit");
    if (adUnit !== unit && adUnit !== unit.split("/")[1]) return new Response(null, { status: 400 });

    // The console's signed callback test may omit custom data. It cannot create a credit.
    const sessionId = params.get("custom_data");
    if (!validRewardId(sessionId)) return new Response(null, { status: 200 });
    const transactionId = params.get("transaction_id");
    const time = adMobTimestampMs(params.get("timestamp"));
    if (!transactionId || !/^[0-9a-f]{16,128}$/i.test(transactionId) ||
        !Number.isSafeInteger(time) || time > Date.now() + 5 * 60_000 || params.get("reward_amount") !== "1") {
      return new Response(null, { status: 400 });
    }

    const db = adminDb();
    const ref = db.collection("androidAnalysisRewards").doc(sessionId);
    const session = (await ref.get()).data();
    if (!session || session.unit !== unit || session.state !== "pending" ||
        time < session.createdAtMs - 60_000 || time > session.adDeadlineMs ||
        Date.now() > session.expiresAt.toMillis()) {
      return new Response(null, { status: 200 });
    }

    const receiptId = `admob_${sessionId}`;
    let state: "granted" | "limit" | "ready";
    if (session.uid) {
      const grant = await grantAdReward(session.uid, "analysis", receiptId, db);
      if ("error" in grant) {
        const { code } = await grant.error.json();
        if (code === "AD_DAILY_LIMIT") state = "limit";
        else if (code === "AD_NOT_NEEDED") state = "ready";
        else return new Response(null, { status: 503 });
      } else {
        state = "granted";
      }
    } else {
      const grant = await guestAdRewardForNetwork(session.guestId, session.networkHash, true, receiptId, db);
      state = grant.credits > 0 || grant.replayed ? "granted" : "limit";
    }
    const changed = await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.state !== "pending") return false;
      tx.update(ref, { state, transactionId, completedAtMs: Date.now() });
      return true;
    });
    if (changed && state === "granted") {
      await recordAttemptAccess(session.attemptId, session.uid, session.guestId);
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
