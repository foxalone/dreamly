"use client";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ANALYSIS_ATTEMPT_COPY } from "@/lib/i18n/analysisAttempts";

type Row = { id: string; text: string; uid?: string; guestId?: string; lang?: string; lens?: string; status: string; reason: string; requestCount?: number; updatedAtMs: number; clientReported?: boolean };
export default function AnalysisAttempts() {
  const locale = useLocale();
  const t = ANALYSIS_ATTEMPT_COPY[locale];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error();
      const res = await fetch("/api/admin/dreams/attempts", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reason = (row: Row) => t.reasons[row.reason as keyof typeof t.reasons] ?? t.reasons.unknown;
  const visible = rows.filter((row) => (completed || row.status !== "succeeded") &&
    [row.text, row.uid, row.guestId, row.id, reason(row)].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] p-4" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t.title}</h2>
        <button type="button" disabled={loading} onClick={() => void load()} className="dream-btn dream-btn--neutral disabled:opacity-50">{loading ? t.loading : t.refresh}</button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{t.help}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} aria-label={t.search} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />{t.completed}</label>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-500">{t.error}</p> : null}
      <div className="mt-3 max-h-[36rem] space-y-3 overflow-y-auto">
        {!visible.length && !loading ? <p className="text-sm text-[var(--muted)]">{t.empty}</p> : null}
        {visible.map((row) => (
          <article key={row.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]">
              <span className="break-all">{row.uid ? t.user : t.guest}: {row.uid ?? row.guestId} · {row.lang} · {row.lens}</span>
              <time dateTime={new Date(row.updatedAtMs).toISOString()}>{new Date(row.updatedAtMs).toLocaleString(locale)}</time>
            </div>
            <p dir="auto" className="mt-2 whitespace-pre-wrap break-words">{row.text}</p>
            <p className={`mt-2 font-medium ${row.status === "succeeded" ? "text-green-500" : "text-amber-500"}`}>{reason(row)}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{t.requests}: {row.requestCount ?? 1}{row.clientReported ? ` · ${t.browser}` : ""}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
