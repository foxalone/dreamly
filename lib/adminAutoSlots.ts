/**
 * One video and one image a day, timed for the US audience (since 2026-09-29).
 * Slots are wall-clock hours in New York, so DST on either side never shifts them:
 * the video goes out at 12:00 ET (lunch on the East Coast, 9:00 on the West Coast),
 * the paired dream-page image at 19:00 ET (evening scroll, 16:00 PT).
 */
export const AUTO_SLOT_TIME_ZONE = "America/New_York";
export const AUTO_SLOT_HOURS = [12] as const;
export const AUTO_IMAGE_HOUR = 19;
/** The nightly cycle books one day ahead: one new pair a night keeps the backlog steady. */
export const AUTO_HORIZON_DAYS = 1;
export const AUTO_PAIRS_PER_DAY = AUTO_SLOT_HOURS.length;
export const AUTO_PAIR_COUNT = AUTO_HORIZON_DAYS * AUTO_PAIRS_PER_DAY;

export type AutoPublishSlot = {
  dateKey: string;
  hour: (typeof AUTO_SLOT_HOURS)[number];
  publishAt: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function zoneParts(instant: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: AUTO_SLOT_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, number>>((accumulator, part) => {
      if (part.type !== "literal") accumulator[part.type] = Number(part.value);
      return accumulator;
    }, {});
}

function zoneOffsetMs(instant: Date) {
  const parts = zoneParts(instant);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - instant.getTime();
}

export function slotDateKey(instant: Date | string) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = zoneParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function addSlotDay(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function slotKey(dateKey: string, hour: number) {
  return `${dateKey}|${hour}`;
}

export function slotWallTimeToIso(dateKey: string, hour: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, 0, 0);
  const firstPass = new Date(wallClock - zoneOffsetMs(new Date(wallClock)));
  return new Date(wallClock - zoneOffsetMs(firstPass)).toISOString();
}

export function publishSlotsForDay(dateKey: string): AutoPublishSlot[] {
  return AUTO_SLOT_HOURS.map((hour) => ({
    dateKey,
    hour,
    publishAt: slotWallTimeToIso(dateKey, hour),
  }));
}

export function occupiedSlotKeys(scheduledAtValues: Array<string | null | undefined>) {
  const occupied = new Set<string>();
  for (const value of scheduledAtValues) {
    const parsed = Date.parse(String(value || ""));
    if (!Number.isFinite(parsed)) continue;
    const instant = new Date(parsed);
    const dateKey = slotDateKey(instant);
    const hour = zoneParts(instant).hour;
    if (AUTO_SLOT_HOURS.includes(hour as (typeof AUTO_SLOT_HOURS)[number])) {
      occupied.add(slotKey(dateKey, hour));
    } else {
      occupied.add(dateKey);
    }
  }
  return occupied;
}

function isDayFree(dateKey: string, taken: Set<string>, nowMs: number) {
  return publishSlotsForDay(dateKey).every((slot) => {
    const when = Date.parse(slot.publishAt);
    return when > nowMs + 60_000 && !taken.has(slotKey(dateKey, slot.hour)) && !taken.has(dateKey);
  });
}

export function nextEmptyPublishDay(occupied: Iterable<string>, now = new Date()) {
  return nextEmptyPublishDays(occupied, 1, now)[0];
}

export function nextEmptyPublishDays(occupied: Iterable<string>, count = AUTO_HORIZON_DAYS, now = new Date()) {
  const taken = new Set(occupied);
  const nowMs = now.getTime();
  const days: string[] = [];
  let dateKey = slotDateKey(now);
  for (let index = 0; index < 400 && days.length < count; index += 1) {
    if (isDayFree(dateKey, taken, nowMs)) {
      days.push(dateKey);
      for (const hour of AUTO_SLOT_HOURS) taken.add(slotKey(dateKey, hour));
    }
    dateKey = addSlotDay(dateKey, 1);
  }
  if (days.length < count) throw new Error("NO_EMPTY_PUBLISH_DAY");
  return days;
}

export function publishSlotsForDays(dateKeys: string[]) {
  return dateKeys.flatMap((dateKey) => publishSlotsForDay(dateKey));
}

/**
 * The earliest free video slots (12:00 ET) in chronological order, partially booked days
 * included — used to refill the holes a failed catch-up pair left behind.
 */
export function nextFreePublishSlots(occupied: Iterable<string>, count: number, now = new Date()): AutoPublishSlot[] {
  const taken = new Set(occupied);
  const nowMs = now.getTime();
  const slots: AutoPublishSlot[] = [];
  let dateKey = slotDateKey(now);
  for (let index = 0; index < 400 && slots.length < count; index += 1) {
    if (!taken.has(dateKey)) {
      for (const slot of publishSlotsForDay(dateKey)) {
        if (slots.length >= count) break;
        const when = Date.parse(slot.publishAt);
        if (when > nowMs + 60_000 && !taken.has(slotKey(dateKey, slot.hour))) slots.push(slot);
      }
    }
    dateKey = addSlotDay(dateKey, 1);
  }
  if (slots.length < count) throw new Error("NO_EMPTY_PUBLISH_DAY");
  return slots;
}

/** The dream-page image of an auto pair goes to socials the same New York day at AUTO_IMAGE_HOUR (12:00 → 19:00 ET). */
export const AUTO_IMAGE_OFFSET_HOURS = AUTO_IMAGE_HOUR - AUTO_SLOT_HOURS[0];

export function imagePublishAtForSlot(videoPublishAt: string) {
  const parsed = Date.parse(videoPublishAt);
  if (!Number.isFinite(parsed)) return "";
  const instant = new Date(parsed);
  // A video off the grid (a hand-picked time, or later than 19:00) keeps a fixed gap instead.
  if (zoneParts(instant).hour >= AUTO_IMAGE_HOUR) return new Date(parsed + AUTO_IMAGE_OFFSET_HOURS * 3_600_000).toISOString();
  return slotWallTimeToIso(slotDateKey(instant), AUTO_IMAGE_HOUR);
}

export type RespaceItem = { id: string; at: string };
export type RespaceMove = RespaceItem & { dateKey: string; publishAt: string; imagePublishAt: string; changed: boolean };

/**
 * Re-space already booked videos to one per day from `cutoff` on: keep their order,
 * give them consecutive slot days starting with the first slot after the cutoff.
 * Idempotent — a second run over the result returns every item unchanged.
 */
export function planOnePerDay(items: RespaceItem[], cutoff: Date): RespaceMove[] {
  const cutoffMs = cutoff.getTime();
  const sorted = items
    .filter((item) => Number.isFinite(Date.parse(item.at)))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at) || left.id.localeCompare(right.id));
  let dateKey = slotDateKey(cutoff);
  if (Date.parse(slotWallTimeToIso(dateKey, AUTO_SLOT_HOURS[0])) < cutoffMs) dateKey = addSlotDay(dateKey, 1);
  return sorted.map((item) => {
    const publishAt = slotWallTimeToIso(dateKey, AUTO_SLOT_HOURS[0]);
    const move = {
      ...item,
      dateKey,
      publishAt,
      imagePublishAt: slotWallTimeToIso(dateKey, AUTO_IMAGE_HOUR),
      changed: Date.parse(item.at) !== Date.parse(publishAt),
    };
    dateKey = addSlotDay(dateKey, 1);
    return move;
  });
}

/** Midnight at the start of tomorrow in dima's time zone — "from tomorrow" means this instant. */
export function startOfTomorrowInJerusalem(now = new Date()) {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year, month, day] = key.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, day + 1, 0, 0, 0);
  const offset = (instant: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instant)).reduce<Record<string, number>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = Number(part.value);
      return acc;
    }, {});
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - instant;
  };
  const first = wall - offset(wall);
  return new Date(wall - offset(first));
}
