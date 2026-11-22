import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { adMobTimestampMs, verifyAdMobCallback } from "@/lib/admobSsv";
import { rewardSessions, treasureRewardUnit, validTreasureChallenge } from "../session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unit = treasureRewardUnit();
  if (!unit) return new Response(null, { status: 503 });
  try {
    const proof = await verifyAdMobCallback(request.url);
    if (!proof) return new Response(null, { status: 400 });
    const adUnit = proof.get("ad_unit"), challenge = proof.get("custom_data");
    if (adUnit === "1234567890" && challenge === null) return new Response(null, { status: 200 });
    const time = adMobTimestampMs(proof.get("timestamp")), transactionId = proof.get("transaction_id");
    if ((adUnit !== unit && adUnit !== unit.split("/")[1]) || !validTreasureChallenge(challenge) ||
        !transactionId || !/^[0-9a-f]{16,128}$/i.test(transactionId) || proof.get("reward_amount") !== "1" ||
        !Number.isSafeInteger(time) || time > Date.now() + 5 * 60_000) return new Response(null, { status: 400 });

    const db = adminDb(), ref = db.collection(rewardSessions).doc(challenge);
    await db.runTransaction(async transaction => {
      const session = (await transaction.get(ref)).data();
      if (!session || session.unit !== unit || session.state !== "pending" ||
          time < session.createdAtMs - 60_000 || time > session.deadlineMs || Date.now() > session.deadlineMs) return;
      transaction.update(ref, { state: "verified", transactionId, verifiedAtMs: Date.now() });
    });
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
