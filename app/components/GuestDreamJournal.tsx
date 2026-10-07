"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { clampDreamText, DREAM_MAX_CHARS } from "@/lib/dreamLength";
import { readHomeDreamQueue, removeHomeDreamPending, writeHomeDreamPending, type HomeDreamPending } from "@/lib/homeDreamPending";
import { DreamLensSelect, useDreamLens } from "./DreamLensChips";
import DreamWordCounter from "./DreamWordCounter";
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
            {dream.emojis?.slice(0, 7).map((emoji, i) => <span key={i}>{emoji.native}</span>)}
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
          <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{ask.analysis}</p>
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
  const [text, setText] = useState("");
  const [lens, setLens] = useDreamLens();
  const refresh = () => setDreams(readHomeDreamQueue().reverse());

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    writeHomeDreamPending(text, { lens, lang: locale, shareToFeed: false });
    setText("");
    refresh();
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-5 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-5">
      <h1 className="inline-flex rounded-full border border-[var(--border)] bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)]">
        {t.nav.dreams} ({dreams.length})
      </h1>
      <form onSubmit={save} className="mt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <textarea value={text} onChange={(event) => setText(clampDreamText(event.target.value))}
            onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") save(event); }}
            maxLength={DREAM_MAX_CHARS} rows={3} placeholder={t.app.writeDream} aria-label={t.app.writeDream}
            className="w-full min-w-0 flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
          <div className="flex gap-2 sm:w-48 sm:shrink-0 sm:flex-col">
            <DreamLensSelect value={lens} onChange={setLens} className="min-h-11 min-w-0 flex-1" />
            <button type="submit" disabled={!text.trim()} className="dream-primary-btn h-11 disabled:opacity-60">{t.app.save}</button>
          </div>
        </div>
        <div className="mt-2 text-end text-xs text-[var(--muted)]"><DreamWordCounter text={text} /></div>
      </form>
      <p className="mt-4 text-xs text-[var(--muted)]">{t.home.askCached}</p>
      <div className="mt-8 space-y-3">
        {dreams.map((dream, index) => (
          <GuestDreamCard key={`${dream.createdAtMs}:${dream.text}`} dream={dream} number={dreams.length - index} refresh={refresh} />
        ))}
        {!dreams.length && <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--muted)]">{t.app.noDreams}</p>}
      </div>
    </main>
  );
}
