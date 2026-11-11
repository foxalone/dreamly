import { createHash, createHmac } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { adminAuth, adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { readGuestId } from "@/app/api/dreams/_lib/guestQuota";
import { dreamAnalysisErrorCode, generateDreamAnalysis } from "@/lib/dreamAnalysisProvider";
import { OPENAI_REASONING_EFFORT } from "@/lib/aiModels";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { loveMatchCanonical, loveMatchPrompt, parseAiLoveMatch, validAiLoveMatch, validLoveMatchInput, type LoveMatchInput } from "@/lib/loveMatchAi";
import { hasPaidAccess, type UserBillingFields } from "@/lib/subscriptions/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const headers = { "Cache-Control": "private, no-store" };
const maxRequestBytes = 2_000_000;

function loveMatchCacheId(input: LoveMatchInput): string {
  return createHash("sha256").update(loveMatchCanonical(input)).digest("hex");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(host) || request.headers.get("origin") !== `${protocol}//${host}` || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers });
  }
  if (Number(request.headers.get("content-length") || 0) > maxRequestBytes) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maxRequestBytes) throw new Error("Too long");
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  }
  if (!validLoveMatchInput(body)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  const accessFields = body as LoveMatchInput & { idToken?: unknown; adChallenge?: unknown; purchaseOrderId?: unknown };
  if ((accessFields.idToken !== undefined && (typeof accessFields.idToken !== "string" || accessFields.idToken.length > 5000)) ||
      (accessFields.adChallenge !== undefined && (typeof accessFields.adChallenge !== "string" || accessFields.adChallenge.length > 64)) ||
      (accessFields.purchaseOrderId !== undefined && (typeof accessFields.purchaseOrderId !== "string" || accessFields.purchaseOrderId.length > 80))) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  }
  for (const photo of [body.firstPhoto, body.secondPhoto]) {
    if (!photo) continue;
    const bytes = Buffer.from(photo.slice(photo.indexOf(",") + 1), "base64");
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
    }
  }
  const key = getOneiroOpenAiApiKey();
  const salt = process.env.GUEST_IP_SALT?.trim() || process.env.CRON_SECRET?.trim();

  let refundLimit: (() => Promise<unknown>) | null = null;
  try {
    const db = adminDb();
    const cacheRef = db.collection("loveMatchCache").doc(loveMatchCacheId(body));
    if (!key || !salt) return NextResponse.json({ error: "AI_UNAVAILABLE" }, { status: 503, headers });
    let paid = false;
    let buyerUid: string | null = null;
    if (typeof accessFields.idToken === "string" && accessFields.idToken) {
      try {
        const uid = (await adminAuth().verifyIdToken(accessFields.idToken)).uid;
        buyerUid = uid;
        const profile = await db.collection("users").doc(uid).get();
        paid = hasPaidAccess(profile.data() as UserBillingFields | undefined);
      } catch { paid = false; }
    }
    const network = process.env.VERCEL === "1"
      ? (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim() || "unknown"
      : "local";
    const day = new Date().toISOString().slice(0, 10);
    const bucket = createHmac("sha256", salt).update(`love-match:${network}:${day}`).digest("hex");
    const ref = db.collection("loveMatchDailyLimits").doc(bucket);
    const guestId = readGuestId(request);
    const challenge = typeof accessFields.adChallenge === "string" ? accessFields.adChallenge : "";
    const grantRef = !paid && /^[0-9a-f-]{36}$/.test(challenge) ? db.collection("loveMatchAdChallenges").doc(challenge) : null;
    const purchaseOrderId = typeof accessFields.purchaseOrderId === "string" ? accessFields.purchaseOrderId : "";
    const purchaseRef = !paid && /^[A-Za-z0-9_-]{8,80}$/.test(purchaseOrderId) ? db.collection("loveMatchPurchases").doc(purchaseOrderId) : null;
    // Only the development server may bypass payment; every production host requires a completed ad or subscription.
    const localTesting = process.env.NODE_ENV !== "production";
    if (!paid && !localTesting && (!guestId || !grantRef && !purchaseRef)) return NextResponse.json({ error: "ACCESS_REQUIRED" }, { status: 402, headers });
    const allowed = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const grant = grantRef ? await transaction.get(grantRef) : null;
      const grantData = grant?.data();
      const purchase = purchaseRef ? await transaction.get(purchaseRef) : null;
      const purchaseData = purchase?.data();
      const validPurchase = !!purchaseData && purchaseData.guestId === guestId && purchaseData.uid === buyerUid && purchaseData.used !== true;
      const validAd = !!grantData && grantData.guestId === guestId && grantData.completed === true && grantData.used !== true && grantData.expiresAt > Date.now();
      if (!paid && !localTesting && !validPurchase && !validAd) return "access";
      if (!localTesting && Number(snapshot.data()?.count ?? 0) >= (paid || validPurchase ? 50 : 10)) return "limit";
      transaction.set(ref, { count: FieldValue.increment(1), day, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (validPurchase && purchaseRef) transaction.set(purchaseRef, { used: true, usedAt: Date.now() }, { merge: true });
      else if (grantRef) transaction.set(grantRef, { used: true, usedAt: Date.now() }, { merge: true });
      return validPurchase ? "purchase" : "ok";
    });
    if (allowed === "access") return NextResponse.json({ error: "ACCESS_REQUIRED" }, { status: 402, headers });
    if (allowed === "limit") return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { ...headers, "Retry-After": "3600" } });
    const consumedPurchase = allowed === "purchase";
    refundLimit = async () => {
      const batch = db.batch();
      batch.set(ref, { count: FieldValue.increment(-1) }, { merge: true });
      if (grantRef) batch.set(grantRef, { used: false }, { merge: true });
      if (consumedPurchase && purchaseRef) batch.set(purchaseRef, { used: false }, { merge: true });
      await batch.commit();
    };
    // A cached reading still requires access and consumes this request's ad grant or paid allowance.
    try {
      const stored = (await cacheRef.get()).get("match");
      if (validAiLoveMatch(stored)) return NextResponse.json({ match: stored, cached: true }, { headers });
    } catch { /* A cache miss still generates a fresh reading. */ }

    const prompt = loveMatchPrompt(body);
    const userContent: ChatCompletionContentPart[] = [{ type: "text", text: prompt.user }];
    if (body.firstPhoto) userContent.push(
      { type: "text", text: "Optional photo of the first person:" },
      { type: "image_url", image_url: { url: body.firstPhoto, detail: "low" } },
    );
    if (body.secondPhoto) userContent.push(
      { type: "text", text: "Optional photo of the second person:" },
      { type: "image_url", image_url: { url: body.secondPhoto, detail: "low" } },
    );
    const openai = new OpenAI({ apiKey: key, timeout: 30000 });
    if (body.firstPhoto || body.secondPhoto) {
      const photoContent: ChatCompletionContentPart[] = [{ type: "text", text: "Check whether each labeled image clearly shows a real human person. Return JSON with keys first and second; each value must be human, invalid, or not_provided. Use invalid for animals, objects, blank images, drawings, screenshots, and uncertain cases. Do not identify anyone or infer any personal traits." }];
      if (body.firstPhoto) photoContent.push({ type: "text", text: "First photo:" }, { type: "image_url", image_url: { url: body.firstPhoto, detail: "low" } });
      if (body.secondPhoto) photoContent.push({ type: "text", text: "Second photo:" }, { type: "image_url", image_url: { url: body.secondPhoto, detail: "low" } });
      const { analysis: verdictText } = await generateDreamAnalysis(async model => {
        const completion = await openai.chat.completions.create({
          model, reasoning_effort: OPENAI_REASONING_EFFORT, response_format: { type: "json_object" }, store: false,
          messages: [{ role: "system", content: "Classify only the visible contents of the attached photos. Respond with JSON only." }, { role: "user", content: photoContent }],
        });
        return completion.choices[0]?.message?.content || "";
      });
      let verdict: unknown = {};
      try { verdict = JSON.parse(verdictText); } catch { /* An unreadable verdict is treated as invalid. */ }
      const photoVerdict = verdict && typeof verdict === "object" ? verdict as { first?: string; second?: string } : {};
      if (body.firstPhoto && photoVerdict.first !== "human") { if (consumedPurchase) await refundLimit(); return NextResponse.json({ error: "INVALID_PHOTO_FIRST" }, { status: 422, headers }); }
      if (body.secondPhoto && photoVerdict.second !== "human") { if (consumedPurchase) await refundLimit(); return NextResponse.json({ error: "INVALID_PHOTO_SECOND" }, { status: 422, headers }); }
    }
    const { analysis } = await generateDreamAnalysis(async model => {
      const completion = await openai.chat.completions.create({
        model, reasoning_effort: OPENAI_REASONING_EFFORT, response_format: { type: "json_object" }, store: false,
        messages: [{ role: "system", content: prompt.system }, { role: "user", content: userContent }],
      });
      return completion.choices[0]?.message?.content || "";
    });
    const match = parseAiLoveMatch(analysis);
    if (!match) {
      await refundLimit().catch(() => {});
      return NextResponse.json({ error: "AI_UNAVAILABLE" }, { status: 503, headers });
    }
    await cacheRef.set({ match, createdAt: Date.now() }).catch(() => {});
    return NextResponse.json({ match }, { headers });
  } catch (error) {
    if (refundLimit) await refundLimit().catch(() => {});
    const code = dreamAnalysisErrorCode(error);
    return NextResponse.json({ error: code }, { status: code === "AI_RATE_LIMITED" ? 429 : 503, headers });
  }
}
