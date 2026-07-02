"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { DreamCategory } from "@/lib/dream-dictionary";
import { DREAM_CATEGORIES } from "@/lib/dream-dictionary";

export type DreamSearchItem = {
  slug: string;
  title: string;
  icon: string;
  aliases: string[];
  category: DreamCategory;
  parentSlug?: string;
};

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/[-_]+/g, " ");
}

export default function DreamSearch({ items }: { items: DreamSearchItem[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);

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
        const title = normalize(item.title);
        const slug = normalize(item.slug);
        const aliases = item.aliases.map(normalize);
        const exact = title.startsWith(normalizedQuery) || slug.startsWith(normalizedQuery);
        const aliasMatch = aliases.some((alias) => alias.includes(normalizedQuery));
        const broadMatch = title.includes(normalizedQuery) || slug.includes(normalizedQuery);
        return { item, score: exact ? 3 : aliasMatch ? 2 : broadMatch ? 1 : 0 };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 8)
      .map(({ item }) => item);
  }, [items, normalizedQuery]);

  return (
    <div className="relative mx-auto mt-8 max-w-xl text-left">
      <label htmlFor="dream-search" className="sr-only">Search the dream dictionary</label>
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] px-4 py-3 shadow-sm transition focus-within:border-violet-400/50 focus-within:ring-4 focus-within:ring-violet-400/10">
        <Search size={18} className="shrink-0 text-[var(--dd-accent-text)]" aria-hidden="true" />
        <input
          id="dream-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search snake, falling teeth, water…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dd-text)] outline-none placeholder:text-[var(--dd-subtle)]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="grid size-7 place-items-center rounded-full text-[var(--dd-subtle)] transition hover:bg-[var(--dd-surface-hover)] hover:text-[var(--dd-text)]"
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
                  <Link
                    href={`/dreams/${item.slug}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--dd-surface-hover)]"
                  >
                    <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--dd-text)]">{item.title}</span>
                      <span className="block text-xs text-[var(--dd-subtle)]">
                        {item.parentSlug ? "Dream variation" : DREAM_CATEGORIES[item.category].label}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-center text-sm text-[var(--dd-muted)]">
              No matching symbol yet. Try a broader word.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
