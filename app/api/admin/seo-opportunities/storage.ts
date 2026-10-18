import { adminDb } from '../_lib/firebaseAdmin';
import { aggregate, day, days, pageRows, type Report, type SearchRow } from '@/lib/seo/opportunities';
export const reportsRef = () => adminDb().collection('seo_reports');
export async function readRows(report: Report): Promise<SearchRow[]> {
  const snapshot = await reportsRef().doc(report.id).collection('chunks').orderBy('index').get();
  return snapshot.docs.flatMap(doc => doc.data().rows as SearchRow[]);
}
export function forWindow(rows: SearchRow[], report: Report, start: string, end: string): SearchRow[] | null {
  if (!report.start || start < report.start || end > report.end) return null;
  if (report.start === start && report.end === end) return rows;
  // Totals cannot be divided by the number of days. Require daily page data.
  const pages = pageRows(rows);
  if (!pages.length || pages.some(r => !r.date)) return null;
  const dateSet = new Set(rows.filter(r => r.date).map(r => r.date));
  for (let d = start; d <= end; d = day(d, 1)) if (!dateSet.has(d)) return null;
  return rows.filter(r => r.date >= start && r.date <= end);
}
export async function loadReports() {
  const snapshot = await reportsRef().orderBy('importedAt', 'desc').limit(60).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Report);
}
export async function saveReport(report: Omit<Report, 'id' | 'chunks' | 'rowCount'>, rows: SearchRow[]) {
  const ref = reportsRef().doc(); const chunks = Math.ceil(rows.length / 200);
  // One atomic batch: no partially visible imports. Each chunk stays far below 1 MiB.
  const batch = adminDb().batch();
  batch.set(ref, { ...report, chunks, rowCount: rows.length });
  for (let i = 0; i < chunks; i++) batch.set(ref.collection('chunks').doc(String(i).padStart(4, '0')), { index: i, rows: rows.slice(i * 200, (i + 1) * 200) });
  await batch.commit(); return ref.id;
}
export async function windowMetric(reports: Report[], url: string, start: string, end: string, cache: Map<string, SearchRow[]>) {
  for (const report of reports.filter(r => !(r as Report & { parentId?: string }).parentId && r.start && r.start <= start && r.end >= end).sort((a, b) => Number(b.start === start && b.end === end) - Number(a.start === start && a.end === end)).slice(0, 2)) {
    if (!report.start || report.start > start || report.end < end || days(start, end) !== 28) continue;
    let rows = cache.get(report.id); if (!rows) { rows = await readRows(report); cache.set(report.id, rows); }
    const window = forWindow(rows, report, start, end); if (!window) continue;
    const page = pageRows(window).filter(r => r.page === url);
    if (page.length) return aggregate(page);
  }
  return null;
}
