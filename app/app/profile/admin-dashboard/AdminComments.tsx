"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ADMIN_COMMENTS_COPY } from "@/lib/i18n/adminComments";
import { localePath } from "@/lib/i18n/path";

type CommentRow = {
  id: string; dreamId: string; dreamText: string; text: string; authorUid: string;
  createdAtMs: number; xpAwarded: number; deleted: boolean; deletedAtMs: number;
};

export default function AdminComments() {
  const locale = useLocale();
  const t = ADMIN_COMMENTS_COPY[locale];
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error();
      const response = await fetch("/api/admin/dreams/comments", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setRows(result.rows ?? []);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return rows.filter((row) => (showDeleted || !row.deleted) && (!needle ||
      [row.text, row.dreamText, row.authorUid, row.id, row.dreamId]
        .some((value) => value.toLocaleLowerCase().includes(needle))));
  }, [rows, search, showDeleted]);

  async function remove(row: CommentRow, hard: boolean) {
    if (!window.confirm(hard ? t.confirmHard : t.confirmSoft)) return;
    setBusyId(row.id);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error();
      const response = await fetch("/api/admin/dreams/comments", {
        method: hard ? "DELETE" : "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dreamId: row.dreamId, commentId: row.id }),
      });
      if (!response.ok) throw new Error();
      await load();
      window.dispatchEvent(new Event("dreamly:admin-comments-changed"));
    } catch {
      setError(t.actionError);
    } finally {
      setBusyId("");
    }
  }

  return <section className="mt-6 rounded-2xl border border-[var(--border)] p-4" dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold">{t.title} ({filtered.length.toLocaleString(locale)})</h2>
      <button type="button" onClick={() => void load()} disabled={loading} className="dream-btn dream-btn--neutral disabled:opacity-50">{loading ? t.loading : t.refresh}</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(50); }} placeholder={t.search} aria-label={t.search} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />{t.showDeleted}</label>
    </div>
    {error ? <p role="alert" className="mt-3 text-sm text-red-500">{error}</p> : null}
    <div className="mt-4 space-y-3">
      {!loading && filtered.length === 0 ? <p className="text-sm text-[var(--muted)]">{t.empty}</p> : null}
      {filtered.slice(0, visibleCount).map((row) => <article key={`${row.dreamId}/${row.id}`} className="rounded-xl border border-[var(--border)] p-4 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
          <span>{t.author}: <span className="font-mono break-all">{row.authorUid}</span></span>
          <time dateTime={row.createdAtMs ? new Date(row.createdAtMs).toISOString() : undefined}>{row.createdAtMs ? new Date(row.createdAtMs).toLocaleString(locale) : ""}</time>
          <span>{t.xp}: {row.xpAwarded}</span>
          {row.deleted ? <span className="font-semibold text-amber-500">{t.deleted}</span> : null}
        </div>
        <p dir="auto" className="mt-2 whitespace-pre-wrap break-words">{row.text}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{t.dream}: <a className="underline" href={localePath(`/dream/${row.dreamId}`, locale)}>{row.dreamText || row.dreamId}</a></p>
        <div className="mt-3 flex flex-wrap gap-2">
          {!row.deleted ? <button type="button" disabled={!!busyId} onClick={() => void remove(row, false)} className="dream-btn dream-btn--neutral disabled:opacity-50">{t.softDelete}</button> : null}
          <button type="button" disabled={!!busyId} onClick={() => void remove(row, true)} className="dream-btn dream-btn--danger disabled:opacity-50">{t.hardDelete}</button>
        </div>
      </article>)}
      {filtered.length > visibleCount ? <button type="button" onClick={() => setVisibleCount((count) => count + 50)} className="dream-btn dream-btn--neutral">{t.showMore}</button> : null}
    </div>
  </section>;
}
