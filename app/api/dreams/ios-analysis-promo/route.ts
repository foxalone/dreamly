import { NextResponse } from "next/server";
import { validRewardId } from "@/lib/rewardedReceipt";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { ANDROID_AD_REDEMPTION_MS } from "../_lib/androidReward";
import { hashIp, newGuestId, readClientIp, readGuestId, setGuestCookie } from "../_lib/guestQuota";
import { requireSignedInUid } from "../_lib/requireUser";

export const runtime = "nodejs";

// Keep this in sync with the bundled 13-second YourFit video.
const VIDEO_DURATION_MS = 13_000;

function reply(body: Record<string, string>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!validRewardId(body?.sessionId) || (body.action !== "start" && body.action !== "complete")) {
      return reply({ code: "INVALID_REQUEST" }, 400);
    }
    const { sessionId, action } = body;
    const auth = body.idToken == null ? null : await requireSignedInUid(body.idToken);
    if (auth && "error" in auth) return auth.error;
    const uid = auth?.uid ?? null;
    const existingGuestId = readGuestId(req);
    const guestCookie = existingGuestId ?? (uid && action === "start" ? newGuestId() : null);
    if (!guestCookie) return reply({ code: "AD_REQUIRED" }, 402);

    const db = adminDb();
    const reward = db.collection("androidAnalysisRewards").doc(sessionId);
    const guest = db.collection("guestQuickSymbol").doc(guestCookie);
    const account = uid ? db.doc(`users/${uid}/houseAdGrants/iosAnalysis`) : null;
    const networkHash = uid ? null : hashIp(readClientIp(req));
    const state = await db.runTransaction(async tx => {
      const session = (await tx.get(reward)).data();
      const now = Date.now();
      if (!session || session.platform !== "ios" || session.rewardTarget?.action !== "analysis" ||
          session.uid !== uid || session.guestId !== (uid ? null : guestCookie)) return "denied";

      if (action === "complete" && session.promoGuestId === guestCookie && session.promoCompletedAtMs != null &&
          now < session.redeemUntilMs) return "granted";
      if (session.state !== "pending" || now >= session.adDeadlineMs) return "denied";

      const dayKey = new Date(now).toISOString().slice(0, 10);
      const network = networkHash ? db.collection("guestQuickSymbolIp").doc(`${networkHash}_${dayKey}`) : null;
      const limits = await tx.getAll(guest, ...(account ? [account] : []), ...(network ? [network] : []));
      if (limits.some(limit => limit.data()?.iosAnalysisPromoUsed === true)) return "denied";

      if (action === "start") {
        tx.update(reward, { promoGuestId: guestCookie, promoReadyAtMs: now + VIDEO_DURATION_MS });
        return "playing";
      }
      if (session.promoGuestId !== guestCookie || typeof session.promoReadyAtMs !== "number") return "denied";
      if (now < session.promoReadyAtMs) return "early";

      const receipt = { iosAnalysisPromoUsed: true, promoCompletedAtMs: now };
      tx.set(guest, receipt, { merge: true });
      if (account) tx.set(account, receipt, { merge: true });
      if (network) tx.set(network, { ...receipt, dayKey }, { merge: true });
      tx.update(reward, {
        state: "granted", promoCompletedAtMs: now, completedAtMs: now,
        redeemUntilMs: now + ANDROID_AD_REDEMPTION_MS,
      });
      return "granted";
    });
    if (state === "denied") return reply({ code: "AD_UNAVAILABLE" }, 403);
    if (state === "early") return reply({ code: "AD_CONFIRMATION_PENDING" }, 409);

    const response = reply({ state });
    return existingGuestId ? response : setGuestCookie(response, guestCookie);
  } catch {
    return reply({ code: "AD_REWARD_FAILED" }, 503);
  }
}
