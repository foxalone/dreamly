import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { AI_VIDEO_COLLECTION, type AiVideoSceneState } from "@/lib/adminAiVideo";
import { requireAdmin } from "@/app/api/admin/_lib/auth";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { serializeAiVideoJob } from "../../_lib";

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
    const reference = adminDb().collection(AI_VIDEO_COLLECTION).doc(jobId);

    await adminDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      const data = snapshot.data() as {
        status?: string;
        videoUrl?: string;
        sceneStates?: AiVideoSceneState[];
        providerTaskIds?: Array<string | null>;
        retryCount?: number;
      };
      if (action === "telegram") {
        if (data.status !== "completed" || !data.videoUrl) throw new Error("TELEGRAM_NOT_READY");
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
      const sceneStates = Array.isArray(data.sceneStates) ? data.sceneStates.map((scene) => ({ ...scene })) : [];
      const providerTaskIds = Array.isArray(data.providerTaskIds) ? [...data.providerTaskIds] : [];
      for (const scene of sceneStates) {
        if (scene.status !== "failed") continue;
        const previousError = String(scene.error || "");
        const safetyRelated = /safety|rai|policy|blocked|filtered|person.?generation|sensitive/i.test(previousError);
        scene.status = "pending";
        scene.taskId = null;
        scene.progress = 0;
        scene.error = "";
        // Only rewrite the prompt for content/safety failures — infrastructure errors must retry as-is.
        if (safetyRelated) scene.safePromptRetryCount = Number(scene.safePromptRetryCount ?? 0) + 1;
        providerTaskIds[scene.index] = null;
      }
      transaction.update(reference, {
        status: "queued",
        stage: "queued-for-resume",
        error: "",
        failedSceneIndex: null,
        sceneStates,
        providerTaskIds,
        batchId: "",
        batchInputFileId: "",
        batchOutputFileId: "",
        batchErrorFileId: "",
        batchStatus: "",
        retryCount: Number(data.retryCount ?? 0) + 1,
        retryTelegramOnly: false,
        retriedBy: uid,
        retriedAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ job: serializeAiVideoJob(await reference.get()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : message === "NOT_FOUND" ? 404 : 409;
    const publicMessages: Record<string, string> = {
      NOT_FOUND: "Job not found",
      NOT_RETRYABLE: "Only failed jobs can be resumed",
      TELEGRAM_NOT_READY: "Telegram delivery can only be retried for a completed video",
    };
    const publicMessage = publicMessages[message] ?? message;
    return NextResponse.json({ error: publicMessage }, { status });
  }
}
