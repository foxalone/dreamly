import { localDayKey, shiftDayKey, type DaySnapshot } from "./contentCounts";

export const METRIC_KEYS = [
  "moon",
  "earth",
  "translation",
  "horoscopeMore",
  "tarotMore",
  "dreams",
  "stories",
  "journal",
  "shared",
  "comments",
  "xp",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const CLICK_KEYS = ["moon", "earth", "translation", "horoscopeMore", "tarotMore"] as const;
export type ClickKey = (typeof CLICK_KEYS)[number];

export const SERIES_DAYS = 90;

export type MetricDay = { date: string } & Record<MetricKey, number | null>;

export type CountEvent = { ms: number; kind: "dreams" | "stories" | "journal" | "shared" | "comments" };
export type XpEvent = { ms: number; xp: number };

const CONTENT_KEYS = ["dreams", "stories", "journal", "shared", "comments", "xp"] as const;

export function readByDay(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(n)) out[key] = Math.max(0, Math.round(n));
  }
  return out;
}

/**
 * Difference between consecutive saved totals.
 * An inferred baseline is not a real total. A gap stays on the later day,
 * because the clicks in between were never split.
 */
export function dailyFromCumulative(
  stored: Record<string, DaySnapshot> | null | undefined,
  key: ClickKey,
  todayKey: string,
  current: number,
): Map<string, number> {
  const points: { date: string; value: number }[] = [];
  for (const [date, snap] of Object.entries(stored ?? {})) {
    if (!snap || snap.inferred || date > todayKey) continue;
    const value = snap[key];
    if (typeof value === "number" && Number.isFinite(value)) points.push({ date, value: Math.round(value) });
    else if (key === "earth") points.push({ date, value: 0 });
  }
  const live = Number.isFinite(current) ? Math.round(current) : 0;
  const today = points.find((point) => point.date === todayKey);
  if (today) today.value = live;
  else points.push({ date: todayKey, value: live });
  points.sort((a, b) => a.date.localeCompare(b.date));
  const deltas = new Map<string, number>();
  for (let i = 1; i < points.length; i += 1) {
    deltas.set(points[i].date, points[i].value - points[i - 1].value);
  }
  return deltas;
}

function dayWindow(todayKey: string, count: number): string[] {
  const days: string[] = [];
  for (let ago = count - 1; ago >= 0; ago -= 1) days.push(shiftDayKey(todayKey, -ago));
  return days;
}

function trimLeadingQuiet(rows: MetricDay[]): MetricDay[] {
  const active = (row: MetricDay) =>
    METRIC_KEYS.some((key) => {
      const value = row[key];
      return typeof value === "number" && value !== 0;
    });
  const first = rows.findIndex(active);
  if (first < 0) return rows.slice(-14);
  return rows.slice(first);
}

/** One row per local day. Content is that day's creations. Clicks are that day's increase. */
export function buildMetricSeries(input: {
  todayKey: string;
  tzOffsetMin: number;
  events: CountEvent[];
  xpEvents: XpEvent[];
  storedDays: Record<string, DaySnapshot> | null | undefined;
  currentClicks: Record<ClickKey, number>;
  byDay: Partial<Record<ClickKey, Record<string, number>>>;
  windowDays?: number;
}): MetricDay[] {
  const window = dayWindow(input.todayKey, input.windowDays ?? SERIES_DAYS);
  const start = window[0];
  const buckets = new Map<string, Record<(typeof CONTENT_KEYS)[number], number>>();
  const ensure = (date: string) => {
    let row = buckets.get(date);
    if (!row) {
      row = { dreams: 0, stories: 0, journal: 0, shared: 0, comments: 0, xp: 0 };
      buckets.set(date, row);
    }
    return row;
  };
  const inWindow = (ms: number) => {
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const date = localDayKey(ms, input.tzOffsetMin);
    if (date < start || date > input.todayKey) return null;
    return date;
  };
  for (const event of input.events) {
    const date = inWindow(event.ms);
    if (!date) continue;
    ensure(date)[event.kind] += 1;
  }
  for (const event of input.xpEvents) {
    const date = inWindow(event.ms);
    const xp = Math.round(Number(event.xp));
    if (!date || !Number.isFinite(xp) || xp === 0) continue;
    ensure(date).xp += xp;
  }

  const clickDeltas = Object.fromEntries(
    CLICK_KEYS.map((key) => [key, dailyFromCumulative(input.storedDays, key, input.todayKey, input.currentClicks[key])]),
  ) as Record<ClickKey, Map<string, number>>;

  const rows = window.map((date) => {
    const content = buckets.get(date);
    const row = {
      date,
      dreams: content?.dreams ?? 0,
      stories: content?.stories ?? 0,
      journal: content?.journal ?? 0,
      shared: content?.shared ?? 0,
      comments: content?.comments ?? 0,
      xp: content?.xp ?? 0,
    } as MetricDay;
    for (const key of CLICK_KEYS) {
      if (clickDeltas[key].has(date)) row[key] = clickDeltas[key].get(date) ?? null;
      else if (input.byDay[key] && Object.prototype.hasOwnProperty.call(input.byDay[key], date)) row[key] = input.byDay[key]![date];
      else row[key] = null;
    }
    return row;
  });
  return trimLeadingQuiet(rows);
}
