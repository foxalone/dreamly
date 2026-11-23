import { after } from "next/server";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { rewardSessions } from "@/app/api/android/treasure/reward/session";
import { beginImage, confirmImageReward, imageAttempt } from "@/lib/dreamImage";
import { petalRewardUnit, verifyPetalReward } from "@/lib/petalSsv";
import { validRewardId } from "@/lib/rewardedReceipt";
import { ANDROID_AD_REDEMPTION_MS } from "../../_lib/androidReward";

export const runtime = "nodejs";
export const maxDuration = 120;

async function confirm(fields: Record<string, string>) {
  if (!petalRewardUnit()) return new Response(null, { status: 503 });
  try {
    const proof = await verifyPetalReward(fields);
    if (!proof || !validRewardId(proof.id)) return new Response(null, { status: 400 });

    const db = adminDb();
    const analysis = db.collection("androidAnalysisRewards").doc(proof.id);
    const treasure = db.collection(rewardSessions).doc(proof.id);
    const receipt = db.collection("androidPetalReceipts").doc(proof.transactionId);
    const handled = await db.runTransaction(async tx => {
      const [analysisDoc, treasureDoc, receiptDoc] = await tx.getAll(analysis, treasure, receipt);
      if (receiptDoc.exists) return true;
      const now = Date.now(), reading = analysisDoc.data(), tool = treasureDoc.data();
      if (reading?.rewardTarget && reading.unit === proof.unit && reading.state === "pending" && now <= reading.adDeadlineMs) {
        tx.create(receipt, { sessionId: proof.id, confirmedAtMs: now });
        tx.update(analysis, { state: "granted", transactionId: proof.transactionId, completedAtMs: now,
          redeemUntilMs: now + ANDROID_AD_REDEMPTION_MS });
        return true;
      }
      if (tool?.unit === proof.unit && tool.state === "pending" && now <= tool.deadlineMs) {
        tx.create(receipt, { sessionId: proof.id, confirmedAtMs: now });
        tx.update(treasure, { state: "verified", transactionId: proof.transactionId, verifiedAtMs: now });
        return true;
      }
      return analysisDoc.exists || treasureDoc.exists;
    });
    if (!handled) {
      const attempt = await imageAttempt(proof.id);
      if (attempt?.platform === "android" && attempt.unit === proof.unit && Date.now() <= attempt.expiresAt &&
          await confirmImageReward(proof.id, attempt, `petal_${proof.transactionId}`)) {
        const image = await beginImage(attempt.uid, attempt.dreamId, undefined, attempt.scope).catch(() => null);
        if (image?.work) after(image.work);
      }
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function GET(req: Request) {
  const query = new URL(req.url).search.slice(1);
  if (query.length > 4096) return new Response(null, { status: 400 });
  const params = new URLSearchParams(query);
  const entries = [...params.entries()];
  // Base64 signatures can contain literal plus signs in a query string.
  const signature = params.get("newSign");
  if (signature) params.set("newSign", signature.replaceAll(" ", "+"));
  if (new Set(params.keys()).size !== entries.length) return new Response(null, { status: 400 });
  return confirm(Object.fromEntries(params));
}

export async function POST(req: Request) {
  const body = await req.text().catch(() => "");
  if (!body || body.length > 4096) return new Response(null, { status: 400 });
  let data: unknown;
  try { data = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      Object.values(data).some(value => typeof value !== "string")) return new Response(null, { status: 400 });
  return confirm(data as Record<string, string>);
}
