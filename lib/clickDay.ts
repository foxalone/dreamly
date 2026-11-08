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
