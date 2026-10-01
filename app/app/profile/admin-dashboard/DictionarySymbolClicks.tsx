"use client";

import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  SYMBOL_CLICK_SOURCE_LABELS,
  SYMBOL_CLICK_SOURCES,
  type SymbolClickSource,
} from "@/lib/symbolClicks";

type ClickRow = {
  slug: string;
  title: string;
  icon: string;
  parentSlug: string | null;
  total: number;
  period: number;
  sources: Partial<Record<SymbolClickSource, number>>;
  locales: Record<string, number>;
  lastAtMs: number | null;
};

type DailyRow = { day: string; total: number };

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 0, label: "All time" },
] as const;

function formatWhen(ms: number | null) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function DictionarySymbolClicks() {
  const [days, setDays] = useState<number>(7);
  const [rows, setRows] = useState<ClickRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in required");
      const response = await fetch(`/api/admin/dictionary-symbol-clicks?days=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Failed to load");
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setDaily(Array.isArray(data?.daily) ? data.daily : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
      setRows([]);
      setDaily([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const totalClicks = rows.reduce((sum, row) => sum + row.period, 0);
  const sourceTotals = SYMBOL_CLICK_SOURCES.map((source) => ({
    source,
    count: rows.reduce((sum, row) => sum + (row.sources[source] ?? 0), 0),
  })).filter((x) => x.count > 0);
  const maxDaily = Math.max(1, ...daily.map((d) => d.total));

  function downloadCsv() {
    const header = ["slug", "title", "clicks_period", "clicks_all_time", ...SYMBOL_CLICK_SOURCES, "last_click"];
    const lines = rows.map((row) =>
      [
        row.slug,
        row.title,
        row.period,
        row.total,
        ...SYMBOL_CLICK_SOURCES.map((s) => row.sources[s] ?? 0),
        row.lastAtMs ? new Date(row.lastAtMs).toISOString() : "",
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `symbol-clicks-${days ? `${days}d` : "all"}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">Symbol icon clicks</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Which dictionary icons people click to open the explanation (home, dictionary hub, search
            results, related symbols, collections, guides). “All time” column and sources are lifetime totals.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                days === p.days
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!rows.length}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => load(days)}
            disabled={loading}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span>
          {totalClicks} clicks · {rows.length} symbols
        </span>
        {sourceTotals.map(({ source, count }) => (
          <span key={source} className="rounded-full border border-[var(--border)] px-2 py-0.5">
            {SYMBOL_CLICK_SOURCE_LABELS[source]}: {count}
          </span>
        ))}
      </div>

      {daily.length > 1 ? (
        <div className="flex h-16 items-end gap-1" aria-label="Clicks per day">
          {[...daily].reverse().map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.total}`}
              className="flex-1 rounded-t bg-violet-500/60"
              style={{ height: `${Math.max(4, (d.total / maxDaily) * 100)}%`, opacity: d.total ? 1 : 0.25 }}
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[color-mix(in_srgb,var(--card)_80%,transparent)] text-xs text-[var(--muted)]">
            <tr>
              <th className="p-3 font-semibold">#</th>
              <th className="p-3 font-semibold">Symbol</th>
              <th className="p-3 font-semibold">Clicks</th>
              <th className="p-3 font-semibold">All time</th>
              <th className="p-3 font-semibold">Where clicked (all time)</th>
              <th className="p-3 font-semibold">Lang</th>
              <th className="p-3 font-semibold">Last click</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-[var(--muted)]">
                  No icon clicks in this period yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.slug} className="border-t border-[var(--border)]">
                  <td className="p-3 tabular-nums text-[var(--muted)]">{index + 1}</td>
                  <td className="p-3">
                    <a
                      href={`/dreams/${row.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--text)] hover:underline"
                    >
                      <span className="text-xl" aria-hidden="true">{row.icon}</span>
                      <span className="font-medium">{row.title}</span>
                    </a>
                    <div className="text-xs text-[var(--muted)]">
                      {row.slug}
                      {row.parentSlug ? ` · variation of ${row.parentSlug}` : ""}
                    </div>
                  </td>
                  <td className="p-3 font-semibold tabular-nums">{row.period}</td>
                  <td className="p-3 tabular-nums text-[var(--muted)]">{row.total}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {SYMBOL_CLICK_SOURCES.filter((s) => row.sources[s]).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-[color-mix(in_srgb,var(--text)_8%,transparent)] px-2 py-0.5 text-xs text-[var(--muted)]"
                        >
                          {SYMBOL_CLICK_SOURCE_LABELS[s]} {row.sources[s]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-[var(--muted)]">
                    {Object.entries(row.locales)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap p-3 text-xs text-[var(--muted)]">{formatWhen(row.lastAtMs)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
