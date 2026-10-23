"use client";
import AnalysisDisplay from "./AnalysisDisplay";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { analyzeDreamMessages, firstDreamMessages } from "@/lib/i18n/first-dream";
import { hasWrittenGuestDream, rememberGuestDreamWritten } from "@/lib/guestDreamHistory";
import { DREAM_MAX_CHARS } from "@/lib/dreamLength";
import { readHomeDreamQueue, removeHomeDreamPending, writeHomeDreamPending, type HomeDreamPending } from "@/lib/homeDreamPending";
import { DreamLensSelect } from "./DreamLensChips";
import DreamComposerForm from "./DreamComposerForm";
import EscapeNote from "./EscapeNote";
import { DreamSymbolIcons } from "./DreamSymbolIcons";
import ShareAnonPrompt from "./ShareAnonPrompt";
import { useDreamAsk } from "./useDreamAsk";

function GuestDreamCard({ dream, number, refresh }: { dream: HomeDreamPending; number: number; refresh: () => void }) {
  const t = useMessages();
  const [expanded, setExpanded] = useState(!!dream.analysis);
  const ask = useDreamAsk({
    source: "guest_journal",
    interpretedEvent: "guest_journal_interpreted",
    initialDream: dream,
    onResultChange: (ready) => {
      if (ready) { setExpanded(true); refresh(); }
    },
  });

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold">{t.nav.dreams} #{number}</h2>
          <span className="inline-flex gap-2 text-lg" aria-hidden="true">
            {dream.emojis?.slice(0, 7).map((emoji, i) => <span key={i} data-esc-source>{emoji.native}</span>)}
          </span>
          <DreamSymbolIcons keys={dream.iconsEn ?? []} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`dream-btn ${ask.analysis ? "dream-btn--blue" : "dream-btn--neutral"}`}
            disabled={ask.busy} aria-expanded={expanded}
            onClick={() => ask.analysis ? setExpanded(!expanded) : void ask.submit()}>
            {ask.busy ? t.app.analyzing : ask.analysis ? t.app.analysis : t.app.analyze}
          </button>
          <button type="button" className="dream-btn dream-btn--danger" disabled={ask.busy}
            onClick={() => { removeHomeDreamPending(dream); refresh(); }}>{t.app.delete}</button>
        </div>
      </div>
      <p dir="auto" className="mt-2 whitespace-pre-wrap break-words">{dream.text}</p>
      {!ask.analysis && <div className="mt-3"><DreamLensSelect value={ask.lens} onChange={ask.chooseLens} disabled={ask.busy} /></div>}
      {ask.error && <p role="alert" className="mt-3 text-sm text-red-500">{ask.error}</p>}
      {expanded && ask.analysis && (
        <section className="mt-4 rounded-xl border border-[var(--border)] p-4">
          <h3 className="font-semibold">{t.app.analysis}</h3>
          {ask.escaped?.length ? <div className="mt-3"><EscapeNote emojis={ask.escaped} /></div> : null}
          {ask.escapeAlreadyToday ? <p className="mt-3 text-sm text-[var(--muted)]">{t.game.escapeAlreadyToday}</p> : null}
          <AnalysisDisplay attemptId={ask.analysisAttemptId}><p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{ask.analysis}</p></AnalysisDisplay>
          <ShareAnonPrompt status={ask.anonShare} onShare={ask.shareAnonymously} onSignIn={() => ask.goToJournal(dream.text, false, true)} />
        </section>
      )}
    </article>
  );
}

export default function GuestDreamJournal() {
  const t = useMessages();
  const locale = useLocale();
  const [dreams, setDreams] = useState<HomeDreamPending[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [hasWrittenDream, setHasWrittenDream] = useState(false);
  const refresh = () => {
    const queue = readHomeDreamQueue();
    if (queue.length) rememberGuestDreamWritten();
    setDreams(queue.reverse());
    setHasWrittenDream((before) => before || queue.length > 0 || hasWrittenGuestDream());
    setHistoryReady(true);
  };
  const composer = useDreamAsk({
    source: "guest_journal",
    interpretedEvent: "guest_journal_interpreted",
    onResultChange: (ready) => { if (ready) refresh(); },
  });
  const { text, setText, lens, chooseLens, busy } = composer;
  const dreamPrompt = historyReady && !hasWrittenDream ? firstDreamMessages[locale] : t.app.writeDream;

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    // Preserve the journal entry even if the request needs an ad/sign-in or fails.
    writeHomeDreamPending(text, { lens, lang: locale, shareToFeed: composer.shareToFeed });
    await composer.submit();
    refresh();
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-5 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-5">
      <h1 className="inline-flex rounded-full border border-[var(--border)] bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)]">
        {t.nav.dreams} ({dreams.length})
      </h1>
      <DreamComposerForm
        className="mt-5" autoFocus
        text={text} onTextChange={setText} onSubmit={analyze}
        lens={lens} onLensChange={chooseLens}
        placeholder={dreamPrompt} label={t.app.writeDream}
        maxChars={DREAM_MAX_CHARS} busy={busy} submitDisabled={!text.trim()}
        submitLabel={analyzeDreamMessages[locale]} busyLabel={t.app.analyzing}
        share={{ checked: composer.shareToFeed, onChange: composer.setShareToFeed }}
      />
      {composer.error ? <p role="alert" className="mt-3 text-sm text-red-500">{composer.error}</p> : null}
      <p className="mt-4 text-xs text-[var(--muted)]">{t.home.askCached}</p>
      <div className="mt-8 space-y-3">
        {dreams.map((dream, index) => (
          <GuestDreamCard key={`${dream.createdAtMs}:${dream.text}:${dream.analysis ?? ""}`} dream={dream} number={dreams.length - index} refresh={refresh} />
        ))}
        {!dreams.length && <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--muted)]">{t.app.noDreams}</p>}
      </div>
    </main>
  );
}
