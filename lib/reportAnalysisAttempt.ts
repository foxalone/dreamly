import type { AttemptEvent } from "@/lib/analysisAttempts";
import { peekAdUnlockPending } from "@/lib/adUnlock";
import { readHomeDreamQueue } from "@/lib/homeDreamPending";

/** Best-effort diagnostics only: never delays the ad, navigation or sign-in. */
export function reportAnalysisAttempt(event: AttemptEvent, dreamText?: string, explicitAttemptId?: string, idToken?: string) {
  const action = peekAdUnlockPending("analysis");
  const text = dreamText ?? action?.dreamText;
  const attemptId = explicitAttemptId ?? (text && readHomeDreamQueue().find((dream) => dream.text === text)?.analysisAttemptId);
  if (!attemptId) return;
  void fetch("/api/dreams/attempt-event", {
    method: "POST", credentials: "same-origin", keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, event, ...(idToken ? { idToken } : {}) }),
  }).catch(() => {});
}


/** Find the attempt for the selected pending dream only. */
export function pendingAnalysisAttemptId(dreamText?: string) {
  const text = dreamText ?? peekAdUnlockPending("analysis")?.dreamText;
  return text ? readHomeDreamQueue().find((item) => item.text === text)?.analysisAttemptId : undefined;
}

/** Capture the ID before sign-in/import/navigation removes the pending dream. */
export function analysisAttemptReporter(dreamText?: string) {
  const text = dreamText ?? peekAdUnlockPending("analysis")?.dreamText;
  const dream = text ? readHomeDreamQueue().find((item) => item.text === text)
    : readHomeDreamQueue().find((item) => item.resumeAnalysis && item.analysisAttemptId && !item.analysis);
  const id = dream?.analysisAttemptId;
  return (event: AttemptEvent) => { if (id) reportAnalysisAttempt(event, undefined, id); };
}
