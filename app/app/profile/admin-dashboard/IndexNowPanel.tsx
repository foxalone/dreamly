"use client";

import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type IndexNowStatus = {
  configured: boolean;
  host: string;
  key: string;
  keyLocation: string;
};

type IndexNowSubmit = {
  ok: boolean;
  mode: "recent" | "all";
  submitted: number;
  status: number;
  since: string | null;
  keyLocation: string;
};

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

export default function IndexNowPanel() {
  const [status, setStatus] = useState<IndexNowStatus | null>(null);
  const [result, setResult] = useState<IndexNowSubmit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<"recent" | "all" | null>(null);

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

  const submit = useCallback(async (mode: "recent" | "all") => {
    setSubmitting(mode);
    setError(null);
    try {
      const data = (await adminFetch("/api/admin/indexnow", {
        method: "POST",
        body: JSON.stringify({ mode }),
      })) as IndexNowSubmit;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "UNKNOWN");
    } finally {
      setSubmitting(null);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">IndexNow · Bing</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Ключ лежит в корне сайта. Cron каждый день в 06:30 UTC шлёт страницы, которые менялись за 14 дней.
            После деплоя один раз нажмите «Все URL», чтобы Bing проверил файл ключа.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void submit("recent")}
            disabled={loading || submitting !== null}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] disabled:opacity-50"
          >
            {submitting === "recent" ? "Отправляем…" : "Недавние"}
          </button>
          <button
            type="button"
            onClick={() => void submit("all")}
            disabled={loading || submitting !== null}
            className="rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-50"
          >
            {submitting === "all" ? "Отправляем…" : "Все URL"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
        <div>
          Хост: <span className="font-mono text-[var(--text)]">{status?.host || "dreamly.art"}</span>
        </div>
        <div>
          Cron: ежедневно 06:30 UTC · тот же <span className="font-mono">CRON_SECRET</span>
        </div>
        {status?.keyLocation ? (
          <div className="sm:col-span-2">
            Файл ключа:{" "}
            <a href={status.keyLocation} className="font-mono text-xs text-emerald-400 hover:underline" target="_blank" rel="noreferrer">
              {status.keyLocation}
            </a>
          </div>
        ) : null}
        {result ? (
          <div className="sm:col-span-2 text-[var(--text)]">
            Отправлено {result.submitted} URL ({result.mode}
            {result.since ? `, с ${result.since}` : ""}) · HTTP {result.status}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-600/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
    </section>
  );
}
