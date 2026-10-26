import { isSign, referenceTime, type Sign } from './model';

export type HoroscopeRequestRow = { day: string; sign: Sign; total: number; free: number; ad: number };
export function validReportRange(from: string, to: string) {
  try {
    const start = +referenceTime(from), end = +referenceTime(to);
    return end >= start && end - start <= 30 * 86400_000;
  } catch { return false; }
}

/** Count persisted unlocks, not generation jobs (which can include a synthetic English master). */
export function summarizeHoroscopeRequests(entries: { path: string; data: Record<string, unknown> }[], from: string, to: string): HoroscopeRequestRow[] {
  const rows = new Map<string, HoroscopeRequestRow>();
  for (const { path, data } of entries) {
    const match = /^horoscope_access\/(?:user|guest)_[a-f0-9]{64}\/days\/(\d{4}-\d{2}-\d{2})\/signs\/([a-z]+)$/.exec(path);
    if (!match || !isSign(data.sign) || data.sign !== match[2] || data.day !== match[1] || data.day < from || data.day > to || !['free', 'ad'].includes(String(data.source))) continue;
    const key = `${data.day}_${data.sign}`;
    const row = rows.get(key) ?? { day: data.day, sign: data.sign, total: 0, free: 0, ad: 0 };
    row.total++;
    if (data.source === 'free') row.free++; else row.ad++;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.day.localeCompare(a.day) || b.total - a.total || a.sign.localeCompare(b.sign));
}
