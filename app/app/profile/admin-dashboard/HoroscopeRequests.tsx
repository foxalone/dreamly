'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { useLocale } from '@/lib/i18n/LocaleProvider';
import { adminHoroscopeRequestsCopy } from '@/lib/i18n/adminHoroscopeRequests';
import { horoscopeCopy } from '@/lib/i18n/horoscope';
import { utcDay } from '@/lib/horoscope/model';
import type { HoroscopeRequestRow } from '@/lib/horoscope/request-report';

export default function HoroscopeRequests({ user }: { user: User }) {
  const locale = useLocale(), t = adminHoroscopeRequestsCopy[locale];
  const [from, setFrom] = useState(() => utcDay(new Date(Date.now() - 29 * 86400_000)));
  const [to, setTo] = useState(() => utcDay());
  const [query, setQuery] = useState(() => ({ from, to, revision: 0 }));
  const [report, setReport] = useState<{ rows: HoroscopeRequestRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const response = await fetch(`/api/admin/horoscope-requests?${new URLSearchParams({ from: query.from, to: query.to })}`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store', signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!controller.signal.aborted) setReport(data);
    })().catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'REPORT_FAILED'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, query]);
  function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(''); setReport(null);
    setQuery(previous => ({ from, to, revision: previous.revision + 1 }));
  }
  return <section className="mt-6 rounded-2xl border border-[var(--border)] p-5" dir={locale === 'ar' ? 'rtl' : undefined} aria-labelledby="horoscope-requests-title">
    <h2 id="horoscope-requests-title" className="text-xl font-semibold">{t.title}</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.note}</p>
    <form onSubmit={submit} className="my-5 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-sm">{t.from}<input type="date" required value={from} onChange={event => setFrom(event.target.value)} max={to} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2" /></label>
      <label className="flex flex-col gap-1 text-sm">{t.to}<input type="date" required value={to} onChange={event => setTo(event.target.value)} min={from} max={utcDay()} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2" /></label>
      <button disabled={loading} className="min-h-10 rounded-full border border-[var(--border)] px-4 text-sm disabled:opacity-50">{t.refresh}</button>
    </form>
    {loading ? <p role="status">{t.loading}</p> : error ? <p role="alert">{error === 'INDEX_REQUIRED' ? t.index : error === 'INVALID_RANGE' || error === 'RANGE_TOO_LARGE' ? t.range : t.error}</p> : report ? <>
      <p className="mb-4 font-semibold">{query.from} – {query.to} · {t.total}: {report.total.toLocaleString(locale)}</p>
      {report.rows.length ? <div className="overflow-x-auto"><table className="w-full text-start text-sm">
        <thead><tr>{[t.day, t.sign, t.total, t.free, t.ad].map(label => <th key={label} scope="col" className="border-b border-[var(--border)] p-3 text-start">{label}</th>)}</tr></thead>
        <tbody>{report.rows.map(row => <tr key={`${row.day}_${row.sign}`}>
          <td className="p-3 whitespace-nowrap"><time dateTime={row.day}>{row.day}</time></td>
          <th scope="row" className="p-3 text-start font-medium">{horoscopeCopy[locale].signs[row.sign]}</th>
          {[row.total, row.free, row.ad].map((value, index) => <td key={index} className="p-3 tabular-nums">{value.toLocaleString(locale)}</td>)}
        </tr>)}</tbody>
      </table></div> : <p>{t.empty}</p>}
    </> : null}
  </section>;
}
