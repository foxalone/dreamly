/** Calendar day in the admin timezone. Click counters have no per-event timestamp, so the bucket is fixed here. */
export function jerusalemDayKey(now = new Date()): string {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("BAD_DAY");
  return key;
}

const jerusalemOffset = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jerusalem",
  timeZoneName: "longOffset",
});

/** UTC timestamp of the start of an Israeli calendar day, including DST changes. */
export function jerusalemMidnightMs(dayKey: string): number {
  const utc = Date.parse(`${dayKey}T00:00:00Z`);
  function offsetAt(instant: number) {
    const zone = jerusalemOffset.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value;
    const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(zone ?? "");
    if (!match) throw new Error("BAD_JERUSALEM_OFFSET");
    return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
  }
  return utc - offsetAt(utc - offsetAt(utc));
}
