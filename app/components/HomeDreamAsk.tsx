"use client";

import { BookOpenText, Loader2, Sparkles } from "lucide-react";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import DreamLensChips from "./DreamLensChips";
import { useDreamAsk } from "./useDreamAsk";

export default function HomeDreamAsk({
  onResultChange,
}: {
  onResultChange?: (hasResult: boolean) => void;
}) {
  const t = useMessages();
  const {
    text,
    setText,
    busy,
    error,
    analysis,
    shareToMap,
    setShareToMap,
    lens,
    chooseLens,
    submit,
    goToJournal,
    maxChars,
  } = useDreamAsk({
    source: "home_ask",
    interpretedEvent: "home_dream_interpreted",
    restorePending: true,
    onResultChange,
  });

  return (
    <div className="mx-auto mt-10 w-full max-w-xl text-start">
      <form onSubmit={submit} className="rounded-3xl bg-purple-600 p-2 shadow-[0_12px_40px_rgba(124,58,237,0.28)]">
        <label className="sr-only" htmlFor="home-dream-text">
          {t.home.askPlaceholder}
        </label>
        <textarea
          id="home-dream-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          maxLength={maxChars}
          placeholder={t.home.askPlaceholder}
          disabled={busy}
          className="w-full resize-none rounded-[1.15rem] bg-white px-4 py-3.5 text-base text-zinc-900 outline-none placeholder:text-zinc-400"
        />
        <div className="flex justify-end px-2 pt-1.5 text-[11px] font-medium tabular-nums">
          <span className={text.length >= maxChars ? "text-amber-200" : "text-white/70"}>
            {text.length}/{maxChars}
          </span>
        </div>
        <div className="px-2 pb-1 pt-2">
          <DreamLensChips value={lens} onChange={chooseLens} disabled={busy} tone="onBrand" />
        </div>
        <div className="flex flex-col gap-2 px-2 pb-1.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 cursor-pointer items-start gap-2 text-xs font-medium text-white/90">
            <input
              type="checkbox"
              checked={shareToMap}
              disabled={busy}
              onChange={(event) => setShareToMap(event.target.checked)}
              className="mt-0.5 size-3.5 shrink-0 rounded border-white/40 bg-white/15 accent-white"
            />
            <span>{t.home.askShareMap}</span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-70 sm:self-auto"
          >
            {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            {busy ? t.home.askBusy : t.home.askSubmit}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 text-center text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {analysis ? null : (
        <div className="mt-4 text-center">
          <p className="mb-3 text-xs text-[var(--muted)]">{t.home.askHint}</p>
          <LocaleLink
            href="/dreams"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--text)] hover:bg-[var(--surface)]"
          >
            <BookOpenText size={16} aria-hidden="true" />
            {t.home.askOrDictionary}
          </LocaleLink>
        </div>
      )}

      {analysis ? (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-start">
          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text)]">{analysis}</p>
          <p className="mt-4 text-xs text-[var(--muted)]">{t.home.askCached}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goToJournal()}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              {t.home.askSave}
            </button>
            <button
              type="button"
              onClick={() => goToJournal()}
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
