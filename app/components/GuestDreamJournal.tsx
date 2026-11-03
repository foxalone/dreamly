"use client";
import AnalysisDisplay from "./AnalysisDisplay";
import DreamAnalysisProgress from "./DreamAnalysisProgress";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { analyzeDreamMessages, firstDreamMessages } from "@/lib/i18n/first-dream";
import { hasWrittenGuestDream, rememberGuestDreamWritten } from "@/lib/guestDreamHistory";
import { readGuestNotes, removeGuestNote, setGuestNoteShared, writeGuestNote, type GuestNote } from "@/lib/guestNotes";
import { DREAM_MAX_CHARS, DREAM_MAX_WORDS, JOURNAL_LIMITS, JOURNAL_MAX_CHARS, JOURNAL_MAX_WORDS, clampText, isDreamTooLong, isTextTooLong } from "@/lib/dreamLength";
import { readHomeDreamQueue, removeHomeDreamPending, writeHomeDreamPending, type HomeDreamPending } from "@/lib/homeDreamPending";
import { DreamLensSelect } from "./DreamLensChips";
import DreamComposerForm from "./DreamComposerForm";
import EscapeNote from "./EscapeNote";
import { DreamSymbolIcons } from "./DreamSymbolIcons";
import ShareAnonPrompt from "./ShareAnonPrompt";
import AnalysisActions from "./AnalysisActions";
import { useDreamAsk } from "./useDreamAsk";
import { cleanAnalysis } from "@/lib/publicDreamAnalysis";
import DiaryTabs from "./DiaryTabs";
import DiaryCalendar, { localDateKey } from "./DiaryCalendar";

function GuestDreamCard({ dream, number, refresh, onCompose }: { dream: HomeDreamPending; number: number; refresh: () => void; onCompose: (tab: "JOURNAL" | "STORIES") => void }) {
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
      <DreamAnalysisProgress active={ask.busy} />
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
          {ask.escaped?.length ? <div className="mt-3"><EscapeNote emojis={ask.escaped} copy={ask.escapeNote} dreamText={dream.text} /></div> : null}
          {ask.escapeAlreadyToday ? <p className="mt-3 text-sm text-[var(--muted)]">{t.game.escapeAlreadyToday}</p> : null}
          <AnalysisDisplay attemptId={ask.analysisAttemptId}><p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{cleanAnalysis(ask.analysis)}</p></AnalysisDisplay>
          <AnalysisActions dreamText={dream.text} language={ask.analysisLang} onCompose={onCompose} />
          <ShareAnonPrompt status={ask.anonShare} copy={ask.guestShareCopy} analysisLanguage={ask.analysisLang} dreamText={dream.text} onShare={ask.shareAnonymously} onSignIn={() => ask.goToJournal(dream.text, false, true)} />
        </section>
      )}
    </article>
  );
}

function GuestNoteCard({ note, number, label, onDelete, deleting }: { note: GuestNote; number: number; label: string; onDelete: () => void; deleting?: boolean }) {
  const t = useMessages();
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold">{label} #{number}</h2>
        <button type="button" className="dream-btn dream-btn--danger" disabled={deleting} onClick={onDelete}>{t.app.delete}</button>
      </div>
      <p dir="auto" className="mt-2 whitespace-pre-wrap break-words">{note.text}</p>
    </article>
  );
}

type GuestTab = "DREAMS" | "STORIES" | "JOURNAL" | "SHARED";

export default function GuestDreamJournal() {
  const t = useMessages();
  const locale = useLocale();
  const [tab, setTab] = useState<GuestTab>("DREAMS");
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("tab")?.toUpperCase();
    if (selected === "JOURNAL" || selected === "STORIES") setTab(selected);
  }, []);
  const openComposer = (selected: "JOURNAL" | "STORIES") => {
    setTab(selected);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [dreams, setDreams] = useState<HomeDreamPending[]>([]);
  const [stories, setStories] = useState<GuestNote[]>([]);
  const [journal, setJournal] = useState<GuestNote[]>([]);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deletingNote, setDeletingNote] = useState<number | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [hasWrittenDream, setHasWrittenDream] = useState(false);
  const refresh = () => {
    const queue = readHomeDreamQueue();
    if (queue.length) rememberGuestDreamWritten();
    setDreams(queue.reverse());
    setStories([...readGuestNotes("story")].reverse());
    setJournal([...readGuestNotes("journal")].reverse());
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
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) refresh(); });
    const restoreRecovered = async () => {
      const pending = readHomeDreamQueue().filter(dream => dream.analysisAttemptId &&
        (!dream.analysis || !dream.guestSharedId));
      for (const dream of pending) {
        try {
          const result = await fetch(`/api/dreams/recovered-attempt?id=${dream.analysisAttemptId}`, {
            credentials: "same-origin", cache: "no-store",
          });
          if (!result.ok || cancelled) continue;
          const data = await result.json();
          if (!data?.ready || typeof data.analysis !== "string" || cancelled) continue;
          writeHomeDreamPending(dream.text, {
            analysis: data.analysis,
            emojis: Array.isArray(data.emojis) ? data.emojis : undefined,
            iconsEn: Array.isArray(data.iconsEn) ? data.iconsEn : undefined,
            rootsEn: Array.isArray(data.rootsEn) ? data.rootsEn : undefined,
            city: data.city ?? undefined,
            guestMapIngested: data.mapIngested === true,
            guestSharedId: typeof data.sharedId === "string" ? data.sharedId : undefined,
          });
          if (dream.shareToFeed !== false && !dream.guestSharedId && !data.sharedId) {
            const shared = await fetch("/api/dreams/share-guest", {
              method: "POST", credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: dream.text, lang: dream.lang, lens: dream.lens,
                emojis: data.emojis, iconsEn: data.iconsEn }),
            });
            const share = await shared.json().catch(() => ({}));
            if (share.sharedId && (shared.ok || share.code === "ALREADY_SHARED")) {
              writeHomeDreamPending(dream.text, { guestSharedId: String(share.sharedId) });
            }
          }
          if (!cancelled) refresh();
        } catch (error) {
          console.warn("Recovered dream restore failed", error);
        }
      }
    };
    void restoreRecovered();
    window.addEventListener("storage", refresh);
    return () => { cancelled = true; window.removeEventListener("storage", refresh); };
  }, []);

  const dreamTab = tab === "DREAMS" || tab === "SHARED";
  const shareTab = dreamTab || tab === "STORIES";
  const sharedDreams = dreams.filter((dream) => !!dream.guestSharedId);
  const sharedStories = stories.filter((note) => !!note.guestSharedId);
  const sharedRows = [
    ...sharedDreams.map((dream) => ({ kind: "dream" as const, dream, at: dream.createdAtMs || 0 })),
    ...sharedStories.map((note) => ({ kind: "story" as const, note, at: note.createdAtMs })),
  ].sort((a, b) => b.at - a.at);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!dreamTab) {
      saveNote(event);
      return;
    }
    if (!text.trim() || busy) return;
    // Preserve the journal entry even if the request needs an ad/sign-in or fails.
    writeHomeDreamPending(text, { lens, lang: locale, shareToFeed: composer.shareToFeed });
    await composer.submit();
    refresh();
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    const journal = tab === "JOURNAL";
    if (journal ? isTextTooLong(value, JOURNAL_LIMITS) : isDreamTooLong(value)) {
      setNoteError(formatMessage(t.app.dreamTooLong, { n: journal ? JOURNAL_MAX_WORDS : DREAM_MAX_WORDS }));
      return;
    }
    const note = writeGuestNote(tab === "JOURNAL" ? "journal" : "story", value);
    if (!note) return;
    setNoteError(null);
    setText("");
    refresh();
    if (tab === "STORIES" && composer.shareToFeed) {
      const shared = await fetch("/api/dreams/share-guest", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, lang: locale, sourceType: "story" }),
      });
      const data = await shared.json().catch(() => ({}));
      if (data?.sharedId && (shared.ok || data.code === "ALREADY_SHARED")) {
        setGuestNoteShared("story", note, String(data.sharedId));
        refresh();
      } else if (!shared.ok) {
        setNoteError(data?.code === "REJECTED" ? t.shareBadges.rejected : t.shareBadges.failed);
      }
    }
  }

  async function deleteStory(note: GuestNote) {
    if (deletingNote) return;
    setDeletingNote(note.createdAtMs);
    try {
      if (note.guestSharedId) {
        const removed = await fetch("/api/dreams/share-guest", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sharedId: note.guestSharedId }),
        });
        if (!removed.ok) {
          setNoteError(t.app.deleteFailed);
          return;
        }
      }
      removeGuestNote("story", note);
      setNoteError(null);
      refresh();
    } finally {
      setDeletingNote(null);
    }
  }

  const visibleNotes = tab === "JOURNAL" ? journal : stories;
  const emptyCopy = tab === "JOURNAL" ? t.app.noJournal : tab === "STORIES" ? t.app.noStories : tab === "SHARED" ? t.app.noShared : t.app.noDreams;

  return (
    <main className="relative mx-auto min-h-screen max-w-3xl px-5 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-5">
      <DreamAnalysisProgress active={busy} />
      <h1 className="sr-only">{t.nav.dreams}</h1>
      <DiaryTabs
        tab={tab}
        onTab={setTab}
        counts={{ DREAMS: dreams.length, STORIES: stories.length, JOURNAL: journal.length, SHARED: sharedRows.length }}
      />
      <div className={tab === "JOURNAL" ? "mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch" : "mt-5"}>
        <DreamComposerForm
          className={tab === "JOURNAL" ? "min-w-0 flex-1" : ""}
        text={text} onTextChange={(raw) => setText(tab === "JOURNAL" ? clampText(raw, JOURNAL_LIMITS) : raw)} onSubmit={analyze}
        lens={lens} onLensChange={chooseLens}
        showLens={dreamTab}
        placeholder={tab === "STORIES" ? t.app.writeStory : tab === "JOURNAL" ? t.app.writeJournal : dreamPrompt}
        label={tab === "STORIES" ? t.app.writeStory : tab === "JOURNAL" ? t.app.writeJournal : t.app.writeDream}
        maxChars={tab === "JOURNAL" ? JOURNAL_MAX_CHARS : DREAM_MAX_CHARS}
        maxWords={tab === "JOURNAL" ? JOURNAL_MAX_WORDS : undefined}
        showToday={tab === "JOURNAL"}
        busy={dreamTab && busy} submitDisabled={!text.trim()}
        submitLabel={dreamTab ? analyzeDreamMessages[locale] : t.app.save}
        busyLabel={t.app.analyzing}
        share={shareTab ? { checked: composer.shareToFeed, onChange: composer.setShareToFeed } : undefined}
        />
        {tab === "JOURNAL" ? <DiaryCalendar markedDays={journal.map((note) => localDateKey(note.createdAtMs))} /> : null}
      </div>
      {(noteError || (dreamTab && composer.error)) ? <p role="alert" className="mt-3 text-sm text-red-500">{noteError || composer.error}</p> : null}
      {dreamTab ? <p className="mt-4 text-xs text-[var(--muted)]">{t.home.askCached}</p> : null}
      <div className="mt-8 space-y-3">
        {tab === "SHARED"
          ? sharedRows.map((row, index) => row.kind === "dream" ? (
            <GuestDreamCard key={`${row.dream.createdAtMs}:${row.dream.text}:${row.dream.analysis ?? ""}`} dream={row.dream} number={sharedRows.length - index} refresh={refresh} onCompose={openComposer} />
          ) : (
            <GuestNoteCard
              key={`${row.note.createdAtMs}:${row.note.text}`}
              note={row.note}
              number={sharedRows.length - index}
              label={t.app.tabStories}
              deleting={deletingNote === row.note.createdAtMs}
              onDelete={() => void deleteStory(row.note)}
            />
          ))
          : dreamTab
          ? dreams.map((dream, index, list) => (
            <GuestDreamCard key={`${dream.createdAtMs}:${dream.text}:${dream.analysis ?? ""}`} dream={dream} number={list.length - index} refresh={refresh} onCompose={openComposer} />
          ))
          : visibleNotes.map((note, index) => (
            <GuestNoteCard
              key={`${note.createdAtMs}:${note.text}`}
              note={note}
              number={visibleNotes.length - index}
              label={tab === "JOURNAL" ? t.app.tabJournal : t.app.tabStories}
              deleting={deletingNote === note.createdAtMs}
              onDelete={() => {
                if (tab === "JOURNAL") {
                  removeGuestNote("journal", note);
                  refresh();
                  return;
                }
                void deleteStory(note);
              }}
            />
          ))}
        {(tab === "SHARED" ? sharedRows : dreamTab ? dreams : visibleNotes).length === 0 && (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--muted)]">{emptyCopy}</p>
        )}
      </div>
    </main>
  );
}
