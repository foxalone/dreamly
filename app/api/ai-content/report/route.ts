import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { hashIp, readClientIp } from "../../dreams/_lib/guestQuota";

const MAX_BYTES = 48 * 1024;
const MAX_REPORTS_PER_DAY = 15;
const DOC_ID = /^[A-Za-z0-9_-]{1,160}$/;

export async function POST(request: Request) {
  // Native clients send the same canonical origin as the Dreamly site.
  const origin = request.headers.get("origin");
  if (!origin || (origin !== "https://dreamly.art" && origin !== new URL(request.url).origin)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ ok: false }, { status: 415 });
  }
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ ok: false }, { status: 400 });
  let item: { kind: "ai"; excerpt: string; attemptId: string | null }
    | { kind: "post" | "comment" | "author"; dreamId: string; commentId?: string };
  try {
    const decoder = new TextDecoder();
    let raw = "";
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        return NextResponse.json({ ok: false }, { status: 413 });
      }
      raw += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(raw + decoder.decode());
    if (data?.kind === "post" || data?.kind === "comment" || data?.kind === "author") {
      const { kind, dreamId, commentId } = data;
      if (typeof dreamId !== "string" || !DOC_ID.test(dreamId)
          || ((kind === "comment" || (kind === "author" && commentId !== undefined))
            && (typeof commentId !== "string" || !DOC_ID.test(commentId)))) {
        return NextResponse.json({ ok: false }, { status: 400 });
      }
      item = kind !== "post" && typeof commentId === "string" ? { kind, dreamId, commentId } : { kind, dreamId };
    } else {
      const excerpt = typeof data?.excerpt === "string" ? data.excerpt.trim() : "";
      const attemptId = typeof data?.attemptId === "string" && /^[a-f0-9]{64}$/.test(data.attemptId) ? data.attemptId : null;
      if (!excerpt || excerpt.length > 8000) return NextResponse.json({ ok: false }, { status: 400 });
      item = { kind: "ai", excerpt, attemptId };
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const db = adminDb();
    const today = new Date().toISOString().slice(0, 10);
    const reporter = hashIp(readClientIp(request));
    // Use a single bounded document per network and day for rate limiting.
    const daily = db.collection("ai_content_report_limits").doc(`${today}_${reporter}`);
    const id = createHash("sha256").update(JSON.stringify([today, reporter, item])).digest("hex");
    const report = db.collection("ai_content_reports").doc(id);
    const accepted = await db.runTransaction(async (tx) => {
      const [prior, counter] = await tx.getAll(report, daily);
      if (prior.exists) return true;
      if (Number(counter.data()?.count ?? 0) >= MAX_REPORTS_PER_DAY) return false;
      tx.set(daily, { count: FieldValue.increment(1), expiresAt: new Date(Date.now() + 2 * 86400_000) }, { merge: true });
      tx.create(report, { ...item, status: "new", createdAt: FieldValue.serverTimestamp() });
      return true;
    });
    return NextResponse.json({ ok: accepted }, { status: accepted ? 200 : 429 });
  } catch (error) {
    console.error("AI content report write failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
