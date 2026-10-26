"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, MoonStar, Search, Sparkles, X } from "lucide-react";
import type { DreamCategory } from "@/lib/dream-categories";
import { getCategoryCopy } from "@/lib/i18n/categories";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { DREAM_MAX_CHARS, clampDreamText } from "@/lib/dreamLength";
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
  const [submitRequest, setSubmitRequest] = useState(0);
  const pendingSubmit = useRef<string | null>(null);

  useEffect(() => {
    if (pendingSubmit.current && ask.text === pendingSubmit.current) {
      pendingSubmit.current = null;
      void ask.submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask.text, submitRequest]);

  function startDreamAsk(raw: string = query, via: "search_field" | "ai_field" = "search_field") {
    const dream = clampDreamText(raw.trim()).trim();
    if (!dream || ask.busy) return;
    trackEvent("dictionary_search_to_interpret", { word_count: countWords(dream), via });
    pendingSubmit.current = dream;
    ask.chooseLens(lens);
    ask.setText(dream);
    setSubmitRequest((request) => request + 1);
    setAiQuery(dream);
    if (via === "search_field") setQuery("");
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
    // This field asks about a dream, including short descriptions. Symbol
    // lookups remain available through the separate dictionary search.
    startDreamAsk(nextQuery, "ai_field");
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
                  onClick={() => startDreamAsk()}
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
        <textarea
          id="dream-ai-query"
          rows={2}
          value={aiQuery}
          disabled={ask.busy}
          onChange={(event) => setAiQuery(event.target.value)}
          placeholder={t.dictionary.askPlaceholder}
          autoComplete="off"
          maxLength={DREAM_MAX_CHARS}
          className="min-w-0 flex-1 resize-y bg-transparent text-sm text-[var(--dd-text)] outline-none placeholder:text-[var(--dd-subtle)]"
        />
        <button
          type="submit"
          disabled={ask.busy || !aiQuery.trim()}
          aria-label={t.home.askSubmit}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-500 text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ask.busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
        </button>
      </form>
      </div>

      {ask.busy ? (
        <p className="mt-3 text-xs text-[var(--dd-muted)]" role="status">{t.home.askBusy}</p>
      ) : null}
      {ask.error ? (
        <p className="mt-3 text-sm text-red-500" role="alert">{ask.error}</p>
      ) : null}

      <div className="mt-3">
        <DreamLensChips
          value={lens}
          onChange={chooseLens}
          disabled={ask.busy}
          tone="onDictionary"
          headerAction={
            <label className="flex min-w-0 cursor-pointer items-start gap-2 text-[11px] text-[var(--dd-muted)]">
              <input
                type="checkbox"
                checked={ask.shareToFeed}
                disabled={ask.busy}
                onChange={(event) => ask.setShareToFeed(event.target.checked)}
                className="mt-0.5 size-3.5 shrink-0 rounded border-[var(--dd-border-strong)] accent-violet-500"
              />
              <span>{t.home.askShareFeed}</span>
            </label>
          }
        />
      </div>
    </div>
  );
}
