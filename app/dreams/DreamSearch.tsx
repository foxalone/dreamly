"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, MoonStar, Search, Sparkles, X } from "lucide-react";
import type { DreamCategory } from "@/lib/dream-categories";
import { getCategoryCopy } from "@/lib/i18n/categories";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { openQuickSymbol } from "./quickSymbolEvents";
import DreamLensChips, { useDreamLens } from "@/app/components/DreamLensChips";
import { trackEvent } from "@/lib/analytics";
import { formatMessage } from "@/lib/i18n/messages";
import { countWords } from "@/lib/quickSymbolLimits";
import { useDreamAsk } from "@/app/components/useDreamAsk";
import {
  containsWholePhrase,
  normalizeMatchText,
  startsWithSearchText,
} from "@/lib/searchMatching";

export type DreamSearchItem = {
  slug: string;
  title: string;
  icon: string;
  aliases: string[];
  category: DreamCategory;
  parentSlug?: string;
};

/** From this many words on, a search query is treated as a dream description, not a symbol lookup. */
export const DREAM_TEXT_MIN_WORDS = 6;

export default function DreamSearch({ items }: { items: DreamSearchItem[] }) {
  const locale = useLocale();
  const t = useMessages();
  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [lens, setLens] = useDreamLens();
  const lastLoggedQuery = useRef("");
  const normalizedQuery = normalizeMatchText(query);
  const wordCount = countWords(query);
  const looksLikeDream = wordCount >= DREAM_TEXT_MIN_WORDS;

  // Whole-dream sentences typed into the symbol search go to the full interpreter
  // (same flow as the homepage Ask), not to the 10-word Quick Symbol.
  const ask = useDreamAsk({
    source: "dictionary_search",
    interpretedEvent: "dictionary_dream_interpreted",
    eventParams: { via: "search_field" },
  });
  const [askOpen, setAskOpen] = useState(false);
  const pendingSubmit = useRef<string | null>(null);

  useEffect(() => {
    if (pendingSubmit.current && ask.text === pendingSubmit.current) {
      pendingSubmit.current = null;
      void ask.submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask.text]);

  function startDreamAsk() {
    const dream = query.trim().slice(0, ask.maxChars);
    if (!dream) return;
    trackEvent("dictionary_search_to_interpret", { word_count: wordCount });
    pendingSubmit.current = dream;
    ask.chooseLens(lens);
    ask.setText(dream);
    setAskOpen(true);
    setQuery("");
  }

  function closeDreamAsk() {
    if (ask.busy) return;
    ask.reset();
    setAskOpen(false);
  }

  function chooseLens(next: typeof lens) {
    setLens(next);
    ask.chooseLens(next);
  }

  // Support /dreams?q=... deep links (used by the WebSite SearchAction schema).
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQuery(initial);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(null, "", url);
  }, [query]);

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return items
      .map((item) => {
        const title = normalizeMatchText(item.title);
        const slug = normalizeMatchText(item.slug);
        const aliases = item.aliases.map(normalizeMatchText);
        const exact =
          startsWithSearchText(title, normalizedQuery) ||
          startsWithSearchText(slug, normalizedQuery);
        const aliasMatch = aliases.some((alias) =>
          containsWholePhrase(alias, normalizedQuery)
        );
        const broadMatch =
          containsWholePhrase(title, normalizedQuery) ||
          containsWholePhrase(slug, normalizedQuery);
        return { item, score: exact ? 3 : aliasMatch ? 2 : broadMatch ? 1 : 0 };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 8)
      .map(({ item }) => item);
  }, [items, normalizedQuery]);

  const logDictionarySearch = useCallback(
    (rawQuery: string, matches: DreamSearchItem[]) => {
      const normalized = normalizeMatchText(rawQuery);
      if (normalized.length < 2 || lastLoggedQuery.current === normalized) return;

      lastLoggedQuery.current = normalized;
      trackEvent("dictionary_search", {
        result_count: matches.length,
        has_results: matches.length > 0,
      });
      void fetch("/api/dreams/search-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: rawQuery.trim(),
          resultCount: matches.length,
          topSlug: matches[0]?.slug ?? null,
        }),
        keepalive: true,
      }).catch(() => {
        // Search analytics must never interrupt the dictionary experience.
      });
    },
    [],
  );

  useEffect(() => {
    if (!normalizedQuery) {
      lastLoggedQuery.current = "";
      return;
    }

    // Dream-length text is not a dictionary lookup; don't pollute the search log with it.
    if (looksLikeDream) return;

    const timeout = window.setTimeout(() => {
      logDictionarySearch(query, results);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [logDictionarySearch, looksLikeDream, normalizedQuery, query, results]);

  function onAiSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = aiQuery.trim();
    if (!nextQuery) return;
    trackEvent("quick_symbol_opened", { source: "dictionary_search" });
    openQuickSymbol(nextQuery, lens);
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl text-left">
      <div className="grid grid-cols-1 gap-2">
      <div className="relative min-w-0">
        <label htmlFor="dream-search" className="sr-only">{t.chrome.searchLabel}</label>
        <div className="flex h-full min-h-12 items-center gap-3 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] px-4 py-3 shadow-sm transition focus-within:border-violet-400/50 focus-within:ring-4 focus-within:ring-violet-400/10">
          <Search size={18} className="shrink-0 text-[var(--dd-accent-text)]" aria-hidden="true" />
          <input
            id="dream-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && looksLikeDream) {
                event.preventDefault();
                startDreamAsk();
              }
            }}
            placeholder={t.dictionary.searchPlaceholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dd-text)] outline-none placeholder:text-[var(--dd-subtle)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-ms-clear]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t.chrome.clearSearch}
              className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--dd-subtle)] transition hover:bg-[var(--dd-surface-hover)] hover:text-[var(--dd-text)]"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {normalizedQuery ? (
          <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-2 shadow-2xl">
            {looksLikeDream ? (
              <div className="flex flex-col gap-3 rounded-xl bg-violet-500/10 px-4 py-4 sm:flex-row sm:items-center">
                <MoonStar size={20} className="shrink-0 text-[var(--dd-accent-text)]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--dd-text)]">{t.dictionary.dreamTextTitle}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--dd-muted)]">{t.dictionary.dreamTextLead}</p>
                </div>
                <button
                  type="button"
                  onClick={startDreamAsk}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
                >
                  <Sparkles size={15} aria-hidden="true" />
                  {t.dictionary.dreamTextCta}
                </button>
              </div>
            ) : null}
            {results.length ? (
              <ul aria-label="Dream search results">
                {results.map((item) => (
                  <li key={item.slug}>
                    <LocaleLink
                      href={`/dreams/${item.slug}`}
                      onClick={() => logDictionarySearch(query, results)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--dd-surface-hover)]"
                    >
                      <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--dd-text)]">{item.title}</span>
                        <span className="block text-xs text-[var(--dd-subtle)]">
                          {item.parentSlug ? t.chrome.dreamVariation : getCategoryCopy(locale, item.category).label}
                        </span>
                      </span>
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            ) : (
              !looksLikeDream ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-[var(--dd-muted)]">{t.chrome.noMatch}</p>
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("quick_symbol_opened", { source: "dictionary_search_nomatch" });
                      openQuickSymbol(query.trim(), lens);
                    }}
                    className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-[var(--dd-accent-text)] transition hover:bg-violet-500/20"
                  >
                    <MoonStar size={14} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{formatMessage(t.dictionary.noMatchAsk, { query: query.trim() })}</span>
                  </button>
                </div>
              ) : null
            )}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={onAiSubmit}
        className="flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-violet-400/35 bg-violet-500/10 px-4 py-3 shadow-sm transition focus-within:border-violet-400/70 focus-within:ring-4 focus-within:ring-violet-400/10"
      >
        <MoonStar size={18} className="shrink-0 text-[var(--dd-accent-text)]" aria-hidden="true" />
        <label htmlFor="dream-ai-query" className="sr-only">{t.dictionary.askLabel}</label>
        <input
          id="dream-ai-query"
          type="text"
          value={aiQuery}
          onChange={(event) => setAiQuery(event.target.value)}
          placeholder={t.dictionary.askPlaceholder}
          autoComplete="off"
          maxLength={120}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dd-text)] outline-none placeholder:text-[var(--dd-subtle)]"
        />
        <button
          type="submit"
          disabled={!aiQuery.trim()}
          aria-label="Open AI dream query"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-500 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </form>
      </div>

      {askOpen ? (
        <section
          aria-label={t.dictionary.dreamTextPanelLabel}
          className="relative mt-3 overflow-hidden rounded-2xl border border-violet-400/35 bg-[var(--dd-surface)] p-4 shadow-sm sm:p-5"
        >
          <div className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-violet-500/20 blur-[70px]" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dd-accent-text)]">{t.brand.name}</p>
                <h3 className="mt-1 text-base font-semibold leading-snug text-[var(--dd-text)]">{t.symbolPrompt.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-[var(--dd-muted)]">{ask.analysis ? t.symbolPrompt.saved : t.symbolPrompt.lead}</p>
              </div>
              <button
                type="button"
                onClick={closeDreamAsk}
                disabled={ask.busy}
                aria-label={t.dictionary.dreamTextClose}
                className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--dd-subtle)] transition hover:bg-[var(--dd-surface-hover)] hover:text-[var(--dd-text)] disabled:opacity-50"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={ask.submit} className="mt-4 space-y-3">
              <label htmlFor="dictionary-dream-text" className="sr-only">{t.symbolPrompt.placeholder}</label>
              <textarea
                id="dictionary-dream-text"
                value={ask.text}
                onChange={(e) => ask.setText(e.target.value)}
                rows={3}
                maxLength={ask.maxChars}
                placeholder={t.symbolPrompt.placeholder}
                disabled={ask.busy}
                className="w-full resize-none rounded-xl border border-[var(--dd-border)] bg-[var(--dd-bg)] px-3.5 py-3 text-[15px] leading-6 text-[var(--dd-text)] outline-none transition placeholder:text-[var(--dd-faint)] focus:border-violet-400 disabled:opacity-70"
              />
              <div className="flex items-center justify-end text-[11px] font-medium tabular-nums text-[var(--dd-subtle)]">
                <span className={ask.text.length >= ask.maxChars ? "text-amber-500" : ""}>
                  {ask.text.length}/{ask.maxChars}
                </span>
              </div>
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 cursor-pointer items-start gap-2 text-xs text-[var(--dd-muted)]">
                  <input
                    type="checkbox"
                    checked={ask.shareToMap}
                    disabled={ask.busy}
                    onChange={(e) => ask.setShareToMap(e.target.checked)}
                    className="mt-0.5 size-3.5 shrink-0 rounded border-[var(--dd-border-strong)] accent-violet-500"
                  />
                  <span>{t.home.askShareMap}</span>
                </label>
                <button
                  type="submit"
                  disabled={ask.busy || !ask.text.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-full bg-[var(--dd-text)] px-4 py-2 text-sm font-semibold text-[var(--dd-bg)] transition hover:opacity-90 disabled:opacity-50 sm:self-auto"
                >
                  {ask.busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                  {ask.busy ? t.home.askBusy : t.home.askSubmit}
                </button>
              </div>
            </form>

            {ask.error ? (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500" role="alert">
                {ask.error}
              </p>
            ) : null}

            {ask.analysis ? (
              <div className="mt-4 rounded-xl border border-[var(--dd-border)] bg-[var(--dd-bg)] p-4">
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--dd-text)]">{ask.analysis}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ask.goToJournal()}
                    className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
                  >
                    {t.home.askSave}
                    <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => ask.goToJournal()}
                    className="rounded-full border border-[var(--dd-border)] px-4 py-2 text-sm font-semibold text-[var(--dd-text)] transition hover:bg-[var(--dd-surface-hover)]"
                  >
                    {t.home.askMore}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-3">
        <DreamLensChips value={lens} onChange={chooseLens} disabled={ask.busy} tone="onDictionary" />
      </div>
    </div>
  );
}
