"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MoonStar, Search, X } from "lucide-react";
import type { DreamCategory } from "@/lib/dream-categories";
import { getCategoryCopy } from "@/lib/i18n/categories";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { openQuickSymbol } from "./quickSymbolEvents";
import { trackEvent } from "@/lib/analytics";
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

export default function DreamSearch({ items }: { items: DreamSearchItem[] }) {
  const locale = useLocale();
  const t = useMessages();
  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const lastLoggedQuery = useRef("");
  const normalizedQuery = normalizeMatchText(query);

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

    const timeout = window.setTimeout(() => {
      logDictionarySearch(query, results);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [logDictionarySearch, normalizedQuery, query, results]);

  function onAiSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = aiQuery.trim();
    if (!nextQuery) return;
    trackEvent("quick_symbol_opened", { source: "dictionary_search" });
    openQuickSymbol(nextQuery);
  }

  return (
    <div className="mx-auto mt-8 grid max-w-3xl grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-2 text-left">
      <div className="relative min-w-0">
        <label htmlFor="dream-search" className="sr-only">{t.chrome.searchLabel}</label>
        <div className="flex h-full min-h-12 items-center gap-3 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] px-4 py-3 shadow-sm transition focus-within:border-violet-400/50 focus-within:ring-4 focus-within:ring-violet-400/10">
          <Search size={18} className="shrink-0 text-[var(--dd-accent-text)]" aria-hidden="true" />
          <input
            id="dream-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.dictionary.searchPlaceholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dd-text)] outline-none placeholder:text-[var(--dd-subtle)]"
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
              <p className="px-4 py-5 text-center text-sm text-[var(--dd-muted)]">
                {t.chrome.noMatch}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={onAiSubmit}
        className="flex min-w-0 items-center gap-2 rounded-2xl border border-violet-400/35 bg-violet-500/10 px-3 py-2 shadow-sm transition focus-within:border-violet-400/70 focus-within:ring-4 focus-within:ring-violet-400/10"
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
  );
}
