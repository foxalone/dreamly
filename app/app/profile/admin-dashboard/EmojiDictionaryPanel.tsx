"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";
import { emojiDictionaryCopy } from "@/lib/i18n/emojiDictionary";

type Row = { count: number; id: string; key: string; emoji: string; name: string; slug: string | null; manual: boolean };
type Article = { slug: string; title: string };
const PAGE_SIZE = 40;

export default function EmojiDictionaryPanel() {
  const locale = useLocale();
  const copy = emojiDictionaryCopy[locale];
  const [rows, setRows] = useState<Row[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState("missing");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(false);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("UNAUTHENTICATED");
      const response = await fetch("/api/admin/emoji-dictionary", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) throw new Error("LOAD_FAILED");
      const data = await response.json();
      setRows(data.rows); setArticles(data.articles);
    } catch { setError(true); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => (filter === "all" || (filter === "missing" ? !row.slug : Boolean(row.slug)))
      && (!query || `${row.emoji} ${row.name} ${row.id} ${row.slug || ""}`.toLowerCase().includes(query)));
  }, [rows, filter, search]);
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);

  async function save(row: Row, reset = false) {
    const slug = reset ? "" : (drafts[row.key] ?? row.slug ?? "").trim();
    if (!reset && !articles.some((article) => article.slug === slug)) { setInvalid(row.key); return; }
    setSaving(row.key); setError(false); setInvalid(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("UNAUTHENTICATED");
      const response = await fetch("/api/admin/emoji-dictionary", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: row.emoji, slug }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      const result = await response.json();
      setRows((current) => current.map((item) => item.key === row.key ? { ...item, slug: result.slug, manual: result.manual } : item));
      setDrafts((current) => { const next = { ...current }; delete next[row.key]; return next; });
    } catch { setError(true); } finally { setSaving(null); }
  }

  const missingCount = rows.filter((row) => !row.slug).length;
  const button = "rounded-full border border-[var(--border)] px-3 py-2 text-sm disabled:opacity-50";
  return <section className="mt-6 space-y-4" dir={locale === "ar" ? "rtl" : "ltr"}>
    <h2 className="font-semibold">{copy.tab}</h2>
    <p className="text-sm text-[var(--muted)]">{copy.help}</p>
    <div className="flex flex-wrap items-center gap-2">
      {([ ["missing", copy.missing, missingCount], ["linked", copy.linked, rows.length - missingCount], ["all", copy.all, rows.length] ] as const).map(([value, label, count]) =>
        <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(0); }} className={`${button} ${filter === value ? "bg-[var(--text)] text-[var(--bg)]" : ""}`}>{label} ({count})</button>)}
      <button type="button" className={button} disabled={busy} onClick={() => void load()}>{busy ? copy.loading : copy.refresh}</button>
    </div>
    <input type="search" value={search} aria-label={copy.search} placeholder={copy.search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} className="w-full rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm" />
    {error && <p role="alert" className="text-red-400">{copy.error}</p>}
    <datalist id="emoji-dictionary-articles">{articles.map((article) => <option key={article.slug} value={article.slug}>{article.title}</option>)}</datalist>
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-start text-sm"><thead><tr>
        <th className="p-3 text-start">{copy.symbol}</th><th className="p-3 text-start">{copy.count}</th><th className="p-3 text-start">{copy.article}</th><th className="p-3 text-start">{copy.action}</th>
      </tr></thead><tbody>
        {!busy && !filtered.length && <tr><td colSpan={4} className="p-4">{copy.empty}</td></tr>}
        {filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((row) => <tr key={row.key} className="border-t border-[var(--border)]">
          <td className="p-3"><span className="me-2 text-2xl">{row.emoji}</span>{row.name}<div className="text-xs text-[var(--muted)]">{row.id}</div></td>
          <td className="p-3 tabular-nums">{row.count}</td>
          <td className="p-3">{row.slug ? <><a href={localePath(`/dreams/${row.slug}`, locale)} target="_blank" rel="noreferrer" className="text-violet-400 underline">{row.slug} ↗</a><div className="text-xs text-[var(--muted)]">{row.manual ? copy.manual : copy.auto}</div></> : <span className="text-amber-400">{copy.missing}</span>}</td>
          <td className="p-3"><div className="flex flex-wrap gap-2">
            <input list="emoji-dictionary-articles" aria-label={`${copy.article}: ${row.name}`} placeholder={copy.placeholder} value={drafts[row.key] ?? row.slug ?? ""} onChange={(event) => { setDrafts((current) => ({ ...current, [row.key]: event.target.value })); setInvalid(null); }} className="min-w-48 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1" />
            <button type="button" className={button} disabled={saving !== null} onClick={() => void save(row)}>{copy.save}</button>
            {row.manual && <button type="button" className={button} disabled={saving !== null} onClick={() => void save(row, true)}>{copy.reset}</button>}
          </div>{invalid === row.key && <p role="alert" className="mt-1 text-xs text-red-400">{copy.invalid}</p>}</td>
        </tr>)}
      </tbody></table>
    </div>
    <div className="flex items-center justify-end gap-3"><span className="text-sm text-[var(--muted)]">{filtered.length} · {currentPage + 1}/{lastPage + 1}</span>
      <button type="button" className={button} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{copy.previous}</button>
      <button type="button" className={button} disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>{copy.next}</button>
    </div>
  </section>;
}
