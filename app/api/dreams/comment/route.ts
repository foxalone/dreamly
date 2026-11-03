import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { requireSignedInUid } from "../_lib/requireUser";
import { readGuestId } from "../_lib/guestQuota";
import { readFullSharedDreamAnalysis } from "@/lib/ensureSharedDreamAnalysis";
import { commentXpReceiptId, scoreDreamComment } from "@/lib/commentXp";
import { COMMENT_XP_MODEL } from "@/lib/aiModels";
import { isShareBadgeId } from "@/lib/shareBadges";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireSignedInUid(body.idToken);
    if ("error" in auth) return auth.error;
    const uid = auth.uid;
    const dreamId = String(body.dreamId ?? "").trim();
    const text = String(body.text ?? "").trim();
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(dreamId) || !text || text.length > 1000) {
      return NextResponse.json({ error: "Invalid comment." }, { status: 400 });
    }

    const db = adminDb();
    const dreamRef = db.collection("shared_dreams").doc(dreamId);
    const commentId = commentXpReceiptId(uid, dreamId, text);
    const commentRef = dreamRef.collection("comments").doc(commentId);
    const userRef = db.collection("users").doc(uid);
    const receiptRef = userRef.collection("commentXpReceipts").doc(commentId);
    const [dreamSnap, existing, receipt] = await Promise.all([dreamRef.get(), commentRef.get(), receiptRef.get()]);
    if (!dreamSnap.exists || dreamSnap.data()?.deleted === true) {
      return NextResponse.json({ error: "Dream not found." }, { status: 404 });
    }
    if (existing.exists) return NextResponse.json({ xp: Number(existing.data()?.xpAwarded ?? 0), alreadyPublished: true });
    if (receipt.exists) return NextResponse.json({ code: "COMMENT_ALREADY_PUBLISHED" }, { status: 409 });

    const data = (dreamSnap.data() ?? {}) as Record<string, unknown>;
    const dream = typeof data.text === "string" ? data.text.trim() : "";
    if (!dream) return NextResponse.json({ error: "Dream not found." }, { status: 404 });
    const guestId = readGuestId(req);
    const ownDream = data.ownerUid === uid || (!!guestId && data.ownerGuestId === guestId);
    const rewardable = data.sourceType !== "story" && !ownDream;
    let xp = 0;
    if (rewardable) {
      const apiKey = getOneiroOpenAiApiKey();
      if (!apiKey) return NextResponse.json({ error: "Comment scoring unavailable." }, { status: 503 });
      const analysis = await readFullSharedDreamAnalysis(db, dreamId, data).catch(() => "")
        || (typeof data.analysisText === "string" ? data.analysisText.trim() : "");
      xp = await scoreDreamComment(apiKey, dream, analysis, text);
    }

    const result = await db.runTransaction(async (tx) => {
      const [currentDream, currentComment, currentReceipt] = await Promise.all([tx.get(dreamRef), tx.get(commentRef), tx.get(receiptRef)]);
      if (!currentDream.exists || currentDream.data()?.deleted === true) throw new Error("Dream not found");
      if (currentComment.exists) return { xp: Number(currentComment.data()?.xpAwarded ?? 0), alreadyPublished: true };
      if (currentReceipt.exists) return { duplicateAfterDelete: true };
      tx.set(commentRef, {
        text, authorUid: uid, badge: isShareBadgeId(body.badge) ? body.badge : "dreamer",
        createdAtMs: Date.now(), createdAt: FieldValue.serverTimestamp(),
        xpAwarded: xp, xpModel: rewardable ? COMMENT_XP_MODEL : null,
      });
      tx.update(dreamRef, { commentCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
      tx.set(receiptRef, { dreamId, xpAwarded: xp, createdAtMs: Date.now() });
      if (xp > 0) tx.set(userRef, { commentXpTotal: FieldValue.increment(xp) }, { merge: true });
      return { xp, alreadyPublished: false };
    });
    if ("duplicateAfterDelete" in result) return NextResponse.json({ code: "COMMENT_ALREADY_PUBLISHED" }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("comment publishing failed", error);
    return NextResponse.json({ error: "Could not publish the comment." }, { status: 503 });
  }
}
