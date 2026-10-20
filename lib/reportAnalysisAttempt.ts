import type { AttemptEvent } from "@/lib/analysisAttempts";
import { peekAdUnlockPending } from "@/lib/adUnlock";
import { readHomeDreamQueue } from "@/lib/homeDreamPending";

/** Best-effort diagnostics only: never delays the ad, navigation or sign-in. */
export function reportAnalysisAttempt(event: AttemptEvent, dreamText?: string) {
  const action = peekAdUnlockPending("analysis");
  const text = dreamText ?? action?.dreamText;
  const attemptId = text && readHomeDreamQueue().find((dream) => dream.text === text)?.analysisAttemptId;
  if (!attemptId) return;
  void fetch("/api/dreams/attempt-event", {
    method: "POST", credentials: "same-origin", keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, event }),
  }).catch(() => {});
}
