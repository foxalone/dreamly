"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type GscRangeKey = "1d" | "3d" | "7d" | "30d";

type GscRangeMeta = {
  startDate: string;
  endDate: string;
  rowCount: number;
};

type GscStatus = {
  configured: boolean;
  connected: boolean;
  serviceAccountEmail: string;
  projectId: string;
  siteUrl: string | null;
  availableSites: string[];
  latestDataDate: string | null;
  lastSyncedAt: string | null;
  lastRowCount: number | null;
  lastStartDate: string | null;
  lastEndDate: string | null;
  ranges: Partial<Record<GscRangeKey, GscRangeMeta>>;
  lastError: string | null;
  cronConfigured: boolean;
  setupHint: string | null;
};

type GscRow = {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  startDate: string | null;
  endDate: string | null;
};

type SortKey = "clicks" | "impressions";

const RANGE_OPTIONS: Array<{ key: GscRangeKey; label: string }> = [
  { key: "1d", label: "Последний день" },
  { key: "3d", label: "3 дня" },
  { key: "7d", label: "Неделя" },
  { key: "30d", label: "Месяц" },
];

function formatWhen(iso: string | null) {
  if (!iso) return "ещё не было";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPosition(value: number) {
  return value.toFixed(1);
}

async function adminFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Нужно войти в аккаунт");
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export default function GscQueriesPanel() {
  const [status, setStatus] = useState<GscStatus | null>(null);
  const [rows, setRows] = useState<GscRow[]>([]);
  const [range, setRange] = useState<GscRangeKey>("1d");
  const [sort, setSort] = useState<SortKey>("clicks");
  const [windowStart, setWindowStart] = useState<string | null>(null);
  const [windowEnd, setWindowEnd] = useState<string | null>(null);
  const [latestDataDate, setLatestDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextSort: SortKey = sort, nextRange: GscRangeKey = range) => {
      setLoading(true);
      setError(null);
      try {
        const [statusPayload, queriesPayload] = await Promise.all([
          adminFetch("/api/admin/gsc/status"),
          adminFetch(`/api/admin/gsc/queries?limit=250&sort=${nextSort}&range=${nextRange}`),
        ]);
        setStatus(statusPayload as GscStatus);
        setRows(Array.isArray(queriesPayload?.rows) ? queriesPayload.rows : []);
        setWindowStart(typeof queriesPayload?.startDate === "string" ? queriesPayload.startDate : null);
        setWindowEnd(typeof queriesPayload?.endDate === "string" ? queriesPayload.endDate : null);
        setLatestDataDate(
          typeof queriesPayload?.latestDataDate === "string"
            ? queriesPayload.latestDataDate
            : typeof statusPayload?.latestDataDate === "string"
              ? statusPayload.latestDataDate
              : null,
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить Search Console");
      } finally {
        setLoading(false);
      }
    },
    [sort, range],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function syncNow() {
    setSyncing(true);
    setError(null);
    try {
      await adminFetch("/api/admin/gsc/sync", { method: "POST" });
      await load(sort, range);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Не удалось синхронизировать");
    } finally {
      setSyncing(false);
    }
  }

  async function copyEmail() {
    const email = status?.serviceAccountEmail;
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Не удалось скопировать email");
    }
  }

  const rangeLabel = useMemo(() => {
    const start = windowStart || status?.ranges?.[range]?.startDate;
    const end = windowEnd || status?.ranges?.[range]?.endDate || latestDataDate;
    if (start && end && start === end) return start;
    if (start && end) return `${start} → ${end}`;
    return "после синхронизации";
  }, [latestDataDate, range, status, windowEnd, windowStart]);

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-500">
              Google Search Console
            </p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Запросы из Google</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Точки отсчёта — последний день данных GSC
              {latestDataDate ? ` (${latestDataDate})` : ""}, не календарный сегодня. Сейчас: {rangeLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load(sort, range)}
              disabled={loading || syncing}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
            >
              {loading ? "Загрузка…" : "Обновить"}
            </button>
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={loading || syncing || !status?.configured}
              className="rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-50"
            >
              {syncing ? "Тянем из Google…" : "Синхронизировать сейчас"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-2">
          <div>
            Статус:{" "}
            <span className={status?.connected ? "text-emerald-400" : "text-amber-300"}>
              {status?.connected ? "подключено" : "нужна настройка в Google"}
            </span>
            {status?.siteUrl ? ` · ${status.siteUrl}` : ""}
          </div>
          <div>
            Последняя синхронизация: {formatWhen(status?.lastSyncedAt ?? null)}
            {typeof status?.ranges?.[range]?.rowCount === "number"
              ? ` · ${status.ranges[range]?.rowCount} запросов`
              : ""}
          </div>
          <div>
            Cron: {status?.cronConfigured ? "ежедневно в 06:15 UTC" : "добавьте CRON_SECRET в Vercel"}
          </div>
          {status?.serviceAccountEmail ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[var(--text)]">{status.serviceAccountEmail}</span>
              <button
                type="button"
                onClick={() => void copyEmail()}
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                {copied ? "Скопировано" : "Копировать email"}
              </button>
            </div>
          ) : null}
        </div>

        {status?.setupHint ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {status.setupHint}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm text-red-200">
          {error}
          {status?.lastError && status.lastError !== error ? (
            <div className="mt-1 text-xs text-red-300">{status.lastError}</div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-[var(--border)] p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setRange(option.key);
                void load(sort, option.key);
              }}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                range === option.key
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-full border border-[var(--border)] p-1">
          {(["clicks", "impressions"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSort(key);
                void load(key, range);
              }}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                sort === key
                  ? "bg-[var(--text)] text-[var(--bg)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {key === "clicks" ? "По кликам" : "По показам"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {rows.length} запросов · Google Search, не поиск внутри сайта · {rangeLabel}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[color-mix(in_srgb,var(--card)_80%,transparent)] text-xs text-[var(--muted)]">
            <tr>
              <th className="p-3 font-semibold">Query</th>
              <th className="p-3 font-semibold">Clicks</th>
              <th className="p-3 font-semibold">Impressions</th>
              <th className="p-3 font-semibold">CTR</th>
              <th className="p-3 font-semibold">Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-[var(--muted)]">
                  Нет снимка за этот диапазон. Нажмите «Синхронизировать сейчас» — подтянутся все четыре окна от
                  последнего дня данных.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="p-3 font-medium text-[var(--text)]">{row.query}</td>
                  <td className="p-3 tabular-nums">{row.clicks}</td>
                  <td className="p-3 tabular-nums">{row.impressions}</td>
                  <td className="p-3 tabular-nums">{formatPct(row.ctr)}</td>
                  <td className="p-3 tabular-nums">{formatPosition(row.position)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
