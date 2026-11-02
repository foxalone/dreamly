export type ContentTotals = {
  dreams: number;
  stories: number;
  journal: number;
  shared: number;
  moon: number;
  earth: number;
};

export type ContentDelta = {
  dreams: number;
  stories: number;
  journal: number;
  shared: number;
  /** Null until a real snapshot from the previous local day exists. */
  moon: number | null;
  /** Null on an inferred baseline. A real snapshot from before Earth tracking counts as zero. */
  earth: number | null;
};

/** Older daily snapshots predate Earth tracking and have no `earth` field. */
export type DaySnapshot = Omit<ContentTotals, "earth"> & { earth?: number; inferred?: boolean };

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

/**
 * Compare today's totals with yesterday.
 * The first time we see a day, yesterday is inferred as "current minus what
 * was created today", so the rise is visible immediately. That inferred
 * baseline is kept for the rest of the day, so later deletes show as a fall.
 * Moon and Earth clicks have no per-day event log, so their delta stays empty
 * until a real snapshot of the previous day exists. Earth was added later:
 * a real snapshot that never recorded it means the prior count was zero.
 */
export function applyDailySnapshot(input: {
  todayKey: string;
  current: ContentTotals;
  addedToday: Pick<ContentTotals, "dreams" | "stories" | "journal" | "shared">;
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
  const delta: ContentDelta = {
    dreams: input.current.dreams - baseline.dreams,
    stories: input.current.stories - baseline.stories,
    journal: input.current.journal - baseline.journal,
    shared: input.current.shared - baseline.shared,
    moon: existing && !existing.inferred ? input.current.moon - baseline.moon : null,
    earth: existing && !existing.inferred ? input.current.earth - priorEarth : null,
  };
  const days: Record<string, DaySnapshot> = {
    ...stored,
    [input.todayKey]: { ...input.current },
  };
  if (!existing) days[yesterdayKey] = baseline;
  const cutoff = shiftDayKey(input.todayKey, -40);
  for (const key of Object.keys(days)) {
    if (key < cutoff || key > input.todayKey) delete days[key];
  }
  return { delta, days };
}
