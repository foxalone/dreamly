export const AUTO_SLOT_TIME_ZONE = "Asia/Jerusalem";
export const AUTO_SLOT_HOURS = [5, 15] as const;
export const AUTO_HORIZON_DAYS = 2;
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

export function jerusalemDateKey(instant: Date | string) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const parts = zoneParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function addJerusalemDay(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function slotKey(dateKey: string, hour: number) {
  return `${dateKey}|${hour}`;
}

export function jerusalemWallTimeToIso(dateKey: string, hour: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, 0, 0);
  const firstPass = new Date(wallClock - zoneOffsetMs(new Date(wallClock)));
  return new Date(wallClock - zoneOffsetMs(firstPass)).toISOString();
}

export function publishSlotsForDay(dateKey: string): AutoPublishSlot[] {
  return AUTO_SLOT_HOURS.map((hour) => ({
    dateKey,
    hour,
    publishAt: jerusalemWallTimeToIso(dateKey, hour),
  }));
}

export function occupiedSlotKeys(scheduledAtValues: Array<string | null | undefined>) {
  const occupied = new Set<string>();
  for (const value of scheduledAtValues) {
    const parsed = Date.parse(String(value || ""));
    if (!Number.isFinite(parsed)) continue;
    const instant = new Date(parsed);
    const dateKey = jerusalemDateKey(instant);
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
  let dateKey = jerusalemDateKey(now);
  for (let index = 0; index < 400 && days.length < count; index += 1) {
    if (isDayFree(dateKey, taken, nowMs)) {
      days.push(dateKey);
      for (const hour of AUTO_SLOT_HOURS) taken.add(slotKey(dateKey, hour));
    }
    dateKey = addJerusalemDay(dateKey, 1);
  }
  if (days.length < count) throw new Error("NO_EMPTY_PUBLISH_DAY");
  return days;
}

export function publishSlotsForDays(dateKeys: string[]) {
  return dateKeys.flatMap((dateKey) => publishSlotsForDay(dateKey));
}
