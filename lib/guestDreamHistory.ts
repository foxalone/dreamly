const KEY = "dreamly:hasWrittenGuestDream";

/** Keep only the fact of a previous entry, even after it leaves the local queue. */
export function hasWrittenGuestDream(): boolean {
  try { return window.localStorage.getItem(KEY) === "1"; }
  catch { return false; }
}

export function rememberGuestDreamWritten() {
  try { window.localStorage.setItem(KEY, "1"); }
  catch { /* The composer still works when persistent storage is unavailable. */ }
}
