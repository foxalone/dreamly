"use client";
import AnalysisDisplay from "./AnalysisDisplay";

import { useMessages } from "@/lib/i18n/LocaleProvider";
import DreamComposerForm from "./DreamComposerForm";
import EscapeNote from "./EscapeNote";
import ShareAnonPrompt from "./ShareAnonPrompt";
import { useDreamAsk } from "./useDreamAsk";

export default function HomeDreamAsk({
  onResultChange,
  journal = false,
}: {
  onResultChange?: (hasResult: boolean) => void;
  journal?: boolean;
}) {
  const t = useMessages();
  const {
    text,
    setText,
    busy,
    error,
    analysis,
    analysisAttemptId,
    shareToFeed,
    setShareToFeed,
    lens,
    chooseLens,
    submit,
    goToJournal,
    reset,
    maxChars,
    anonShare,
    shareAnonymously,
    escaped,
  } = useDreamAsk({
    source: "home_ask",
    interpretedEvent: "home_dream_interpreted",
    restorePending: true,
    redirectToJournal: !journal,
    onResultChange,
  });

  return (
    <div className="mx-auto mt-10 flex w-full max-w-xl flex-col text-start">
      <DreamComposerForm
        text={text} onTextChange={setText} onSubmit={submit}
        lens={lens} onLensChange={chooseLens}
        textareaId="home-dream-text" placeholder={t.home.askPlaceholder}
        maxChars={maxChars} busy={busy} submitLabel={t.home.askSubmit}
        share={{ checked: shareToFeed, onChange: setShareToFeed }}
      />

      {error ? (
        <p className="mt-3 text-center text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {analysis && journal ? (
        <div className="order-first mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-start">
          <h2 className="mb-3 font-semibold">{t.app.analysis}</h2>
          {escaped?.length ? <EscapeNote emojis={escaped} /> : null}
          <AnalysisDisplay attemptId={analysisAttemptId}><p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">{analysis}</p></AnalysisDisplay>
          <ShareAnonPrompt status={anonShare} onShare={shareAnonymously} onSignIn={() => goToJournal(text, false, true)} />
          <p className="mt-4 text-xs text-[var(--muted)]">{t.home.askCached}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
            >
              {t.home.askMore}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
