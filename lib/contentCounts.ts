export type ContentTotals = {
  dreams: number;
  stories: number;
  journal: number;
  shared: number;
  moon: number;
  earth: number;
  translation: number;
  horoscopeMore: number;
  tarotMore: number;
  comments: number;
  xp: number;
};

export type ContentCounts = Pick<ContentTotals, "dreams" | "stories" | "journal" | "shared">;
export type ContentDelta = Record<keyof ContentTotals, number | null>;

/** Older daily snapshots may omit metrics that were added later. */
export type DaySnapshot = ContentCounts & { moon: number } & Partial<ContentTotals> & {
  inferred?: boolean;
  closedAtMs?: number;
};

/** Daily click charts read these snapshots, so keep a season of them. */
export const SNAPSHOT_KEEP_DAYS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

export function clampTzOffsetMin(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-14 * 60, Math.min(14 * 60, Math.trunc(n)));
}

/** `YYYY-MM-DD` in the visitor's timezone. `tzOffsetMin` is `Date.getTimezoneOffset()`. */
export function localDayKey(nowMs: number, tzOffsetMin: number): string {
  const shifted = new Date(nowMs - tzOffsetMin * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** UTC millis of local midnight for the day that contains `nowMs`. */
export function startOfLocalDayMs(nowMs: number, tzOffsetMin: number): number {
  const [year, month, day] = localDayKey(nowMs, tzOffsetMin).split("-").map(Number);
  return Date.UTC(year, month - 1, day) + tzOffsetMin * 60_000;
}

export function shiftDayKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function whole(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function retainRecentSnapshots(days: Record<string, DaySnapshot>, latestDay: string) {
  const cutoff = shiftDayKey(latestDay, -SNAPSHOT_KEEP_DAYS);
  return Object.fromEntries(Object.entries(days).filter(([key]) => key >= cutoff));
}

/** Replace the interim or inferred row with the totals at the actual closing boundary. */
export function closeDailySnapshot(
  stored: Record<string, DaySnapshot>,
  dayKey: string,
  totals: ContentTotals,
  closedAtMs: number,
) {
  return retainRecentSnapshots({ ...stored, [dayKey]: { ...totals, closedAtMs } }, dayKey);
}

/**
 * Compare today's totals with yesterday.
 * The first time we see a day, yesterday is inferred as "current minus what
 * was created today", so the rise is visible immediately. That inferred
 * baseline is kept for the rest of the day, so later deletes show as a fall.
 * Metrics without a known previous value stay blank. A real snapshot from
 * before Earth tracking counts as zero for Earth to preserve its history.
 */
export function applyDailySnapshot(input: {
  todayKey: string;
  current: ContentTotals;
  addedToday: ContentCounts;
  stored: Record<string, DaySnapshot> | null | undefined;
}): { delta: ContentDelta; days: Record<string, DaySnapshot> } {
  const yesterdayKey = shiftDayKey(input.todayKey, -1);
  const stored = input.stored ?? {};
  const existing = stored[yesterdayKey];
  const baseline: DaySnapshot = existing ?? {
    dreams: whole(input.current.dreams - input.addedToday.dreams),
    stories: whole(input.current.stories - input.addedToday.stories),
    journal: whole(input.current.journal - input.addedToday.journal),
    shared: whole(input.current.shared - input.addedToday.shared),
    moon: whole(input.current.moon),
    earth: whole(input.current.earth),
    inferred: true,
  };
  const priorEarth = typeof existing?.earth === "number" ? existing.earth : 0;
  function trackedDelta(key: keyof ContentTotals) {
    const prior = existing?.[key];
    return existing && !existing.inferred && typeof prior === "number" && Number.isFinite(prior)
      ? input.current[key] - prior
      : null;
  }
  const delta: ContentDelta = {
    dreams: input.current.dreams - baseline.dreams,
    stories: input.current.stories - baseline.stories,
    journal: input.current.journal - baseline.journal,
    shared: input.current.shared - baseline.shared,
    moon: trackedDelta("moon"),
    earth: existing && !existing.inferred ? input.current.earth - priorEarth : null,
    translation: trackedDelta("translation"),
    horoscopeMore: trackedDelta("horoscopeMore"),
    tarotMore: trackedDelta("tarotMore"),
    comments: trackedDelta("comments"),
    xp: trackedDelta("xp"),
  };
  const days: Record<string, DaySnapshot> = {
    ...stored,
    [input.todayKey]: stored[input.todayKey]?.closedAtMs ? stored[input.todayKey] : { ...input.current },
  };
  if (!existing) days[yesterdayKey] = baseline;
  return { delta, days: retainRecentSnapshots(days, input.todayKey) };
}
