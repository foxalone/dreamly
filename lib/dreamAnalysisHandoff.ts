import type { Locale } from "./i18n/config";
import { localePath } from "./i18n/path";
import type { DreamLens } from "./dream-lenses";
import { readHomeDreamQueue, writeHomeDreamPending } from "./homeDreamPending";
import { peekAdUnlockPending, takeAdUnlockPending } from "./adUnlock";

/** All full-dream entry points hand the request to the journal before calling AI. */
export function queueDreamAnalysis(text: string, locale: Locale, lens: DreamLens, shareToFeed: boolean) {
  writeHomeDreamPending(text, { analysis: "", resumeAnalysis: true, lang: locale, lens, shareToFeed });
  return localePath("/app/dreams", locale);
}

/** Claim only this dream's queued request or its server-confirmed ad retry. */
export function takeDreamAnalysisResume(text: string): boolean {
  const dream = readHomeDreamQueue().find(item => item.text === text);
  if (!dream || dream.analysis) return false;
  const ad = peekAdUnlockPending("analysis");
  const ready = takeAdUnlockPending("analysis", text);
  if (!ready && (!dream.resumeAnalysis || ad)) return false;
  writeHomeDreamPending(text, { resumeAnalysis: false });
  return true;
}
