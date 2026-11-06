/** The featured forecast enters the feed at 06:00 on the visitor's calendar day. */
export function featuredFeedSlot(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const todayRelease = new Date(year, month, date, 6);
  const releasedToday = now.getTime() >= todayRelease.getTime();
  const release = releasedToday ? todayRelease : new Date(year, month, date - 1, 6);
  const nextRefreshMs = new Date(year, month, date + (releasedToday ? 1 : 0), 6).getTime();
  const day = `${release.getFullYear()}-${String(release.getMonth() + 1).padStart(2, "0")}-${String(release.getDate()).padStart(2, "0")}`;
  return { day, publishedAtMs: release.getTime(), nextRefreshMs };
}
