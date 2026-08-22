import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { AI_IMAGE_COLLECTION } from "@/lib/adminAiImage";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { serializeAiImageJob } from "../../_lib";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const uid = await requireAdmin(request);
    const { jobId } = await context.params;
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(jobId)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }
    const payload = (await request.json().catch(() => ({}))) as { action?: unknown };
    const action = payload.action === "telegram" ? "telegram" : "resume";
    const reference = adminDb().collection(AI_IMAGE_COLLECTION).doc(jobId);

    await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      const data = snapshot.data() as { status?: string; imageUrl?: string };
      if (action === "telegram") {
        if (data.status !== "completed" || !data.imageUrl) throw new Error("TELEGRAM_NOT_READY");
        transaction.update(reference, {
          status: "queued",
          stage: "queued-telegram-retry",
          progress: 96,
          retryTelegramOnly: true,
          telegramStatus: "queued",
          telegramError: "",
          error: "",
          retriedBy: uid,
          retriedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (data.status !== "failed") throw new Error("NOT_RETRYABLE");
      transaction.update(reference, {
        status: "queued",
        stage: "queued-for-resume",
        progress: 0,
        error: "",
        retryCount: FieldValue.increment(1),
        retryTelegramOnly: false,
        retriedBy: uid,
        retriedAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ job: serializeAiImageJob(await reference.get()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : message === "NOT_FOUND" ? 404 : 409;
    const publicMessages: Record<string, string> = {
      NOT_FOUND: "Job not found",
      NOT_RETRYABLE: "Only failed jobs can be resumed",
      TELEGRAM_NOT_READY: "Telegram delivery can only be retried for a completed image",
    };
    const publicMessage = publicMessages[message] ?? message;
    return NextResponse.json({ error: publicMessage }, { status });
  }
}
