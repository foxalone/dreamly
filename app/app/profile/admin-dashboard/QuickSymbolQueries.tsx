"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type QueryRow = {
  id: string;
  query: string;
  normalized: string;
  count: number;
  lastMatched: boolean;
  lastSlug: string | null;
  hasPage: boolean;
  lastCost: number;
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

export default function QuickSymbolQueries() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in required");

      const res = await fetch("/api/admin/quick-symbol-queries?limit=150", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to load");
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const missCount = rows.filter((r) => !r.hasPage).length;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Quick symbol queries</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Sorted by popularity. Misses without a dictionary page are SEO candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="text-xs text-[var(--muted)]">
        {rows.length} queries · {missCount} without page
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
              <th className="p-3 font-semibold">Last</th>
              <th className="p-3 font-semibold">Page</th>
              <th className="p-3 font-semibold">Cost</th>
              <th className="p-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-[var(--muted)]">
                  No queries yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="p-3 text-[var(--text)]">
                    <div className="font-medium">{r.query || r.normalized}</div>
                    {r.normalized && r.normalized !== r.query.toLowerCase() ? (
                      <div className="text-xs text-[var(--muted)]">{r.normalized}</div>
                    ) : null}
                  </td>
                  <td className="p-3 tabular-nums">{r.count}</td>
                  <td className="p-3">
                    {r.lastMatched ? (
                      <span className="text-emerald-400">match</span>
                    ) : (
                      <span className="text-amber-300">miss</span>
                    )}
                  </td>
                  <td className="p-3">
                    {r.lastSlug ? (
                      <a
                        href={`/dreams/${r.lastSlug}`}
                        className="text-[var(--accent,#a78bfa)] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.lastSlug}
                      </a>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="p-3 tabular-nums">{r.lastCost}</td>
                  <td className="p-3 whitespace-nowrap text-xs text-[var(--muted)]">
                    {formatWhen(r.lastAtMs)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
