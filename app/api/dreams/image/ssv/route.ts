import { after } from "next/server";
import { adMobTimestampMs, verifyAdMobCallback } from "@/lib/admobSsv";
import { beginImage, confirmImageReward, imageAdUnit, imageAttempt, validImageId } from "@/lib/dreamImage";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const unit = imageAdUnit();
  if (!unit) return new Response(null, { status: 503 });
  try {
    const params = await verifyAdMobCallback(request.url);
    if (!params) return new Response(null, { status: 400 });
    const adUnit = params.get("ad_unit");
    const attemptId = params.get("custom_data");
    if (adUnit === "1234567890" && attemptId === null) return new Response(null);
    const transactionId = params.get("transaction_id");
    const time = adMobTimestampMs(params.get("timestamp"));
    if ((adUnit !== unit && adUnit !== unit.split("/")[1]) || !validImageId(attemptId)
      || !transactionId || !/^[0-9a-f]{16,128}$/i.test(transactionId)
      || params.get("reward_amount") !== "1" || !Number.isSafeInteger(time) || time > Date.now() + 60_000) {
      return new Response(null, { status: 400 });
    }
    const attempt = await imageAttempt(attemptId);
    if (!attempt || attempt.platform !== "android" || attempt.unit !== unit
      || time < attempt.issuedAt - 60_000 || time > attempt.expiresAt) return new Response(null);
    if (await confirmImageReward(attemptId, attempt, transactionId)) {
      const result = await beginImage(attempt.uid, attempt.dreamId, undefined, attempt.scope).catch(() => null);
      if (result?.work) after(result.work);
    }
    return new Response(null);
  } catch { return new Response(null, { status: 503 }); }
}
