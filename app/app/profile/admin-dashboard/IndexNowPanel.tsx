"use client";

import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type IndexNowStatus = {
  configured: boolean;
  host: string;
  keyLocation: string;
  state: { count: number; submittedAt: string | null } | null;
};

type IndexNowSubmit = {
  ok: boolean;
  mode: "changed" | "all" | "url";
  submitted: number;
  status: number;
  keyLocation: string;
  baseline?: boolean;
  added?: number;
  updated?: number;
  removed?: number;
  url?: string;
};

type Action = "changed" | "all" | "url";

async function adminFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Нужно войти в аккаунт");
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function describeResult(result: IndexNowSubmit) {
  if (result.mode === "url") return `Отправлен ${result.url} · HTTP ${result.status}`;
  if (result.mode === "all") return `Отправлено ${result.submitted} URL (все) · HTTP ${result.status}`;
  if (result.baseline) return "Первый запуск: инвентарь сохранён, ничего не отправляли";
  const parts = [`новых ${result.added ?? 0}`, `изменённых ${result.updated ?? 0}`, `удалённых ${result.removed ?? 0}`];
  return `Отправлено ${result.submitted} URL (${parts.join(", ")})${result.status ? ` · HTTP ${result.status}` : ""}`;
}

export default function IndexNowPanel() {
  const [status, setStatus] = useState<IndexNowStatus | null>(null);
  const [result, setResult] = useState<IndexNowSubmit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<Action | null>(null);
  const [testUrl, setTestUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await adminFetch("/api/admin/indexnow")) as IndexNowStatus;
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNKNOWN");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async (action: Action) => {
    setSubmitting(action);
    setError(null);
    try {
      const body = action === "url" ? { url: testUrl.trim() } : { mode: action };
      const data = (await adminFetch("/api/admin/indexnow", {
        method: "POST",
        body: JSON.stringify(body),
      })) as IndexNowSubmit;
      setResult(data);
      if (action === "changed") void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNKNOWN");
    } finally {
      setSubmitting(null);
    }
  }, [load, testUrl]);

  const busy = loading || submitting !== null || status?.configured === false;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">IndexNow · Bing / Yandex</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ключ берётся из <span className="font-mono">INDEXNOW_KEY</span>. Cron каждый день в 06:30 UTC шлёт только новые,
            изменённые и удалённые страницы. Картинки страниц отправляются сразу при смене. «Все URL» — только вручную,
            например после смены ключа.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void submit("changed")}
            disabled={busy}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
          >
            {submitting === "changed" ? "Отправляем…" : "Изменённые"}
          </button>
          <button
            type="button"
            onClick={() => void submit("all")}
            disabled={busy}
            className="rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-50"
          >
            {submitting === "all" ? "Отправляем…" : "Все URL"}
          </button>
        </div>
      </div>

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (testUrl.trim()) void submit("url");
        }}
      >
        <input
          type="text"
          value={testUrl}
          onChange={(event) => setTestUrl(event.target.value)}
          placeholder="/dreams/snake или https://dreamly.art/es/dreams/snake"
          className="min-w-[16rem] flex-1 rounded-full border border-[var(--border)] bg-transparent px-4 py-2 font-mono text-xs text-[var(--text)] placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          disabled={busy || !testUrl.trim()}
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
        >
          {submitting === "url" ? "Отправляем…" : "Проверить один URL"}
        </button>
      </form>

      <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
        <div>
          Хост: <span className="font-mono text-[var(--text)]">{status?.host || "dreamly.art"}</span>
        </div>
        <div>
          {status?.state
            ? `В инвентаре ${status.state.count} URL · последняя отправка ${status.state.submittedAt ? new Date(status.state.submittedAt).toLocaleString("ru-RU") : "—"}`
            : status?.configured === false
              ? "INDEXNOW_KEY не задан — отправка выключена"
              : "Инвентарь ещё не сохранён (первый cron только запишет его)"}
        </div>
        {status?.keyLocation ? (
          <div className="sm:col-span-2">
            Файл ключа:{" "}
            <a href={status.keyLocation} className="font-mono text-xs text-emerald-400 hover:underline" target="_blank" rel="noreferrer">
              {status.keyLocation}
            </a>
          </div>
        ) : null}
        {result ? <div className="sm:col-span-2 text-[var(--text)]">{describeResult(result)}</div> : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
    </section>
  );
}
