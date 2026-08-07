"use client";

import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import QueriesCsvDownload from "./QueriesCsvDownload";

type QueryRow = {
  id: string;
  query: string;
  normalized: string;
  count: number;
  lastHasResults: boolean;
  lastResultCount: number;
  lastTopSlug: string | null;
  lastAtMs: number | null;
};

function formatWhen(ms: number | null) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

export default function DictionarySearchQueries() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in required");

      const response = await fetch(
        "/api/admin/dictionary-search-queries?limit=150",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Failed to load");
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const missCount = rows.filter((row) => !row.lastHasResults).length;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">
            Dictionary search queries
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Regular search field. Searches without results are content candidates.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <QueriesCsvDownload />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="text-xs text-[var(--muted)]">
        {rows.length} queries · {missCount} without results
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[color-mix(in_srgb,var(--card)_80%,transparent)] text-xs text-[var(--muted)]">
            <tr>
              <th className="p-3 font-semibold">Query</th>
              <th className="p-3 font-semibold">Count</th>
              <th className="p-3 font-semibold">Results</th>
              <th className="p-3 font-semibold">Top page</th>
              <th className="p-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-[var(--muted)]">
                  No dictionary searches yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="p-3 text-[var(--text)]">
                    <div className="font-medium">{row.query || row.normalized}</div>
                    {row.normalized &&
                    row.normalized !== row.query.toLowerCase() ? (
                      <div className="text-xs text-[var(--muted)]">
                        {row.normalized}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 tabular-nums">{row.count}</td>
                  <td className="p-3">
                    {row.lastHasResults ? (
                      <span className="text-emerald-400">
                        {row.lastResultCount}
                      </span>
                    ) : (
                      <span className="text-amber-300">none</span>
                    )}
                  </td>
                  <td className="p-3">
                    {row.lastTopSlug ? (
                      <a
                        href={`/dreams/${row.lastTopSlug}`}
                        className="text-[var(--accent,#a78bfa)] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.lastTopSlug}
                      </a>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-xs text-[var(--muted)]">
                    {formatWhen(row.lastAtMs)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
