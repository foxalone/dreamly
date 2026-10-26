"use client";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ANALYSIS_ATTEMPT_COPY } from "@/lib/i18n/analysisAttempts";
import { ANALYSIS_DIAGNOSIS_COPY } from "@/lib/i18n/analysisDiagnosis";
import { analysisDiagnosis } from "@/lib/analysisDiagnosis";

type Row = {
  city?: string; country?: string; admin1?: string; citySource?: string;
  source?: string; dreamId?: string; createdAtMs?: number; startedAtMs?: number;
  wordCount?: number; charCount?: number; durationMs?: number; httpStatus?: number;
  analysis?: string; model?: string; emojiModel?: string; emojis?: { native: string }[];
  displayedAtMs?: number | null;
  events?: { event: string; atMs: number; source?: "server" | "browser"; httpStatus?: number }[];
  userAgent?: string; lastEvent?: string;
  id: string; text: string; uid?: string; guestId?: string; lang?: string; lens?: string; status: string; reason: string; requestCount?: number; updatedAtMs: number; clientReported?: boolean;
};
export default function AnalysisAttempts() {
  const locale = useLocale();
  const t = ANALYSIS_ATTEMPT_COPY[locale];
  const diagnosisCopy = ANALYSIS_DIAGNOSIS_COPY[locale];
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(true);
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
  const reason = (row: Row) => row.status === "succeeded" ? t.reasons.analysis_ready : t.reasons[row.reason as keyof typeof t.reasons] ?? t.reasons.unknown;
  const visible = rows.filter((row) => (completed || row.status !== "succeeded") &&
    [row.text, row.uid, row.guestId, row.id, row.city, row.country, row.admin1, row.source, row.dreamId, reason(row), diagnosisCopy[analysisDiagnosis(row, now).code], diagnosisCopy[analysisDiagnosis(row, now).kind]].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
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
        {visible.map((row) => {
          const diagnosis = analysisDiagnosis(row, now);
          const authEvent = [...(row.events ?? [])].reverse().find((item) => item.event.startsWith("auth_"))?.event
            ?? (row.lastEvent?.startsWith("auth_") ? row.lastEvent : undefined);
          return (
          <article key={row.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]">
              <span className="break-all">{row.uid ? t.user : t.guest}: {row.uid ?? row.guestId} · {row.lang} · {row.lens}</span>
              <time dateTime={new Date(row.updatedAtMs).toISOString()}>{new Date(row.updatedAtMs).toLocaleString(locale)}</time>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {t.location}: {[row.city, row.admin1, row.country].filter(Boolean).join(", ") || t.noLocation}
              {row.citySource ? ` (${row.citySource})` : ""}
              {row.source ? ` · ${t.source}: ${row.source}` : ""}
            </p>
            {row.emojis?.length ? <p className="mt-2">{row.emojis.map((e) => e.native).join(" ")}</p> : null}
            <p dir="auto" className="mt-2 whitespace-pre-wrap break-words">{row.text}</p>
            <p className={`mt-2 font-medium ${row.status === "succeeded" ? "text-green-500" : "text-amber-500"}`}>{row.displayedAtMs ? t.reasons.analysis_displayed : reason(row)}</p>
            <div className={`mt-2 rounded-lg border p-2 ${diagnosis.kind === "service" ? "border-red-500/50" : "border-[var(--border)]"}`}>
              <p className="font-medium">{diagnosisCopy.title}: {diagnosisCopy[diagnosis.kind]}</p>
              {diagnosis.code !== diagnosis.kind ? <p className="mt-1 text-xs">{diagnosisCopy[diagnosis.code]}</p> : null}
              {diagnosis.evidence ? <p className="mt-1 text-xs font-medium">
                {t.reasons[diagnosis.evidence.event as keyof typeof t.reasons] ?? t.reasons.unknown}
                {diagnosis.evidence.httpStatus ? ` · HTTP ${diagnosis.evidence.httpStatus}` : ""}
              </p> : null}
            </div>
            {row.status === "succeeded" && !row.displayedAtMs ? <p className="mt-1 text-xs text-[var(--muted)]">{t.displayUnknown}</p> : null}
            <p className="mt-1 text-xs text-[var(--muted)]">{t.signIn}: {authEvent ? t.reasons[authEvent as keyof typeof t.reasons] ?? t.reasons.unknown : t.noSignIn}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{t.requests}: {row.requestCount ?? 1}{row.clientReported ? ` · ${t.browser}` : ""}</p>
            <details className="mt-2 text-xs text-[var(--muted)]">
              <summary className="cursor-pointer">{t.details}</summary>
              <div className="mt-2 grid gap-1 break-words">
                <div>{t.attemptId}: {row.id}</div>
                {row.dreamId ? <div>{t.dreamId}: {row.dreamId}</div> : null}
                {(row.createdAtMs || row.startedAtMs) ? <div>{t.started}: {new Date(row.createdAtMs ?? row.startedAtMs!).toLocaleString(locale)}</div> : null}
                <div>{t.updated}: {new Date(row.updatedAtMs).toLocaleString(locale)}</div>
                <div>{t.words}: {row.wordCount ?? row.text.trim().split(/\s+/u).filter(Boolean).length} · {t.characters}: {row.charCount ?? row.text.length}</div>
                {row.durationMs != null ? <div>{t.duration}: {new Intl.NumberFormat(locale, { style: "unit", unit: "second", maximumFractionDigits: 2 }).format(row.durationMs / 1000)}</div> : null}
                {row.httpStatus != null ? <div>HTTP: {row.httpStatus}</div> : null}
                {row.model ? <div>AI: {row.model}{row.emojiModel ? ` · ${row.emojiModel}` : ""}</div> : null}
                {row.lastEvent ? <div>{t.lastEvent}: {t.reasons[row.lastEvent as keyof typeof t.reasons] ?? t.reasons.unknown}</div> : null}
                {row.userAgent ? <div>{t.userAgent}: {row.userAgent}</div> : null}
              </div>
            </details>
            {row.events?.length ? <details open className="mt-2 text-xs text-[var(--muted)]">
              <summary className="cursor-pointer">{t.history}</summary>
              <ol className="mt-2 space-y-1">
                {row.events.map((item, index) => <li key={`${item.atMs}-${index}`}>
                  <time dateTime={new Date(item.atMs).toISOString()}>{new Date(item.atMs).toLocaleString(locale)}</time>
                  {" · "}{t.reasons[item.event as keyof typeof t.reasons] ?? t.reasons.unknown}
                  {" · "}{item.source === "server" ? t.eventServer : t.eventBrowser}
                  {item.httpStatus != null ? ` · HTTP ${item.httpStatus}` : ""}
                </li>)}
              </ol>
            </details> : null}
            {row.analysis ? <details className="mt-2 text-sm"><summary className="cursor-pointer">{t.analysis} · {row.lens}</summary><p dir="auto" className="mt-2 whitespace-pre-wrap break-words">{row.analysis}</p></details> : null}
          </article>
        );})}
      </div>
    </section>
  );
}
