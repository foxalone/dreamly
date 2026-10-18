/** Shared serializable contracts and conservative GSC calculations. No browser/server dependencies. */
export type Metrics = { clicks: number; impressions: number; position: number; ctr: number };
export type SearchRow = Metrics & { page: string; query: string; date: string };
export type Report = { id: string; name: string; importedAt: string; start: string; end: string; chunks: number; rowCount: number; warnings: string[] };
export type SeoField = 'title' | 'description';
export type Recommendation = { value: string; reason: string; state: 'pending' | 'applied' | 'rejected' };
export type Analysis = { id: string; url: string; createdAt: string; language: string; original: Record<SeoField, string>; title: Recommendation; description: Recommendation; intent: string; content: { text: string; reason: string; state: 'pending' | 'rejected' }[]; links: { url: string; reason: string; state: 'pending' | 'rejected' }[]; queryCount: number };
export type Change = { id: string; url: string; field: SeoField; before: string; after: string; at: string; revertedAt?: string; analysisId: string; beforeChangeId?: string | null };
export function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s; }
export function day(s: string, n: number) { return new Date(Date.parse(s) + n * 86400000).toISOString().slice(0, 10); }
export function days(start: string, end: string) { return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1; }
export function publicUrl(raw: string): string | null {
  try { if (raw.length > 512) return null; const u = new URL(raw); if (!['dreamly.art', 'www.dreamly.art'].includes(u.hostname) || u.protocol !== 'https:' || u.port || u.username || u.password || u.search || u.hash) return null; const canonical = `https://dreamly.art${u.pathname.replace(/\/$/, '') || '/'}`; return canonical.length <= 512 ? canonical : null; } catch { return null; }
}
export function aggregate(rows: Metrics[]): Metrics {
  const impressions = rows.reduce((n, r) => n + r.impressions, 0);
  const clicks = rows.reduce((n, r) => n + r.clicks, 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? rows.reduce((n, r) => n + r.position * r.impressions, 0) / impressions : 0 };
}
/** Never combine independent Pages/Queries/Dates sheets: that would multiply totals. */
export function pageRows(rows: SearchRow[]) {
  const pages = rows.filter(r => r.page && !r.query);
  return pages.length ? pages : rows.filter(r => r.page && r.query);
}
export function totals(rows: SearchRow[]) {
  const dates = rows.filter(r => r.date && !r.page && !r.query);
  const pages = pageRows(rows);
  return aggregate(dates.length ? dates : pages.length ? pages : rows.filter(r => r.query && !r.page));
}
export function groupedPages(rows: SearchRow[]) {
  const grouped = new Map<string, SearchRow[]>();
  for (const row of pageRows(rows)) { const existing = grouped.get(row.page); if (existing) existing.push(row); else grouped.set(row.page, [row]); }
  return [...grouped].map(([url, items]) => ({ url, ...aggregate(items) }));
}
export function opportunities(rows: SearchRow[], min = 6, max = 15, impressions = 300, gap = .1) {
  const pages = groupedPages(rows);
  const language = (u: string) => new URL(u).pathname.match(/^\/(es|ar|pt|de|ru)\//)?.[1] || 'en';
  const languages = new Map(pages.map(p => [p.url, language(p.url)]));
  return pages.map(p => {
    // Compare only same-language pages, close ranks, and meaningful samples. Exclude self.
    const peers = pages.filter(q => q.url !== p.url && languages.get(q.url) === languages.get(p.url) && Math.abs(q.position - p.position) <= 2 && q.impressions >= 100);
    const benchmark = peers.length >= 3 ? aggregate(peers).ctr : null;
    const shortfall = benchmark === null ? null : Math.max(0, benchmark - p.ctr);
    const eligible = p.position >= min && p.position <= max && p.impressions >= impressions;
    const lowCtr = benchmark !== null && p.ctr < benchmark * (1 - gap);
    const score = eligible ? p.impressions * (shortfall ?? 0) * Math.min(1, p.impressions / 1000) * (16 - Math.min(p.position, 15)) / 10 : 0;
    return { ...p, benchmark, peers: peers.length, score, eligible, lowCtr, level: score >= 10 ? 'high' : score >= 2 ? 'medium' : 'low' };
  }).sort((a, b) => b.score - a.score);
}
export function equivalent(a: Report, b: Report) { return !!a.start && !!b.start && days(a.start, a.end) === days(b.start, b.end) && day(b.end, 1) === a.start; }
/** Only whole, explicitly dated reports support before/after claims. No prorating totals. */
export function resultWindows(at: string) { const date = at.slice(0, 10); return { before: { start: day(date, -28), end: day(date, -1) }, after: { start: day(date, 1), end: day(date, 28) } }; }
export function resultStatus(before: Metrics | null, after: Metrics | null) {
  if (!before || !after || Math.min(before.impressions, after.impressions) < 300) return '⏳ Недостаточно данных';
  const delta = after.clicks - before.clicks;
  const noise = Math.max(5, Math.sqrt(before.clicks + after.clicks) * 2, before.clicks * .1);
  return delta > noise ? '🟢 Стало лучше' : delta < -noise ? '🔴 Стало хуже' : '🟡 Без заметных изменений';
}
