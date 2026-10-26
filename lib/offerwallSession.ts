import { localeFromPathname, localePath } from "./i18n/path";
import { markAdUnlockReady, peekAdUnlockPending, safeNext } from "./adUnlock";

const KEY = "dreamly.offerwallSession";
type OfferwallSession = {
  pendingAtMs: number;
  dreamText: string;
  dreamId?: string;
  rewardId: string;
  next: string;
  initialEntitlement: string;
  shown: boolean;
  status: "watching" | "completed" | "granted";
};

export function offerwallEntitlement(cookie: string): string {
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("FCOEC="))?.slice(6) ?? "";
}

export function readOfferwallSession(): OfferwallSession | null {
  try {
    const pending = peekAdUnlockPending("analysis");
    const raw = sessionStorage.getItem(KEY);
    if ((!pending?.dreamText && !pending?.dreamId) || !raw) return null;
    const saved = JSON.parse(raw) as OfferwallSession;
    if (saved.pendingAtMs !== pending.atMs || saved.dreamText !== (pending.dreamText ?? "") || saved.dreamId !== pending.dreamId || typeof saved.rewardId !== "string" ||
        typeof saved.initialEntitlement !== "string" || typeof saved.shown !== "boolean" ||
        !["watching", "completed", "granted"].includes(saved.status)) return null;
    return { ...saved, next: localePath("/app/dreams", localeFromPathname(safeNext(saved.next))) };
  } catch {
    return null;
  }
}

function save(session: OfferwallSession) {
  try { sessionStorage.setItem(KEY, JSON.stringify(session)); } catch { /* The live flow still works without storage. */ }
}

/** Keep the same replay key if Safari reloads or restores the ad page. */
export function startOfferwallSession(next: string, rewardId: string, cookie: string) {
  const previous = readOfferwallSession();
  if (previous) return previous;
  const pending = peekAdUnlockPending("analysis");
  if (!pending?.dreamText && !pending?.dreamId) return null;
  const session: OfferwallSession = {
    pendingAtMs: pending.atMs, dreamText: pending.dreamText ?? "", ...(pending.dreamId ? { dreamId: pending.dreamId } : {}), rewardId, next: localePath("/app/dreams", localeFromPathname(safeNext(next))),
    initialEntitlement: offerwallEntitlement(cookie), shown: false, status: "watching",
  };
  save(session);
  return session;
}

export function updateOfferwallSession(update: Partial<Pick<OfferwallSession, "shown" | "status">>) {
  const session = readOfferwallSession();
  if (session) {
    save({ ...session, ...update });
    if (update.status === "granted") markAdUnlockReady();
  }
}

/** A return/back event alone is not evidence that an ad finished. */
export function recoverOfferwallSession(cookie: string) {
  const session = readOfferwallSession();
  if (!session) return null;
  const entitlement = offerwallEntitlement(cookie);
  if (session.status === "watching" && session.shown && entitlement && entitlement !== session.initialEntitlement) {
    session.status = "completed";
    save(session);
  }
  return session;
}

/** Capture the same close signal as the live observer before a document leaves.
 * requestAnimationFrame/polling can stop during navigation, so persisting this
 * synchronously lets the return page book the existing receipt. A visible ad
 * or pagehide by itself never counts as completion.
 */
export function captureOfferwallDeparture(cookie: string, overlayVisible: boolean) {
  const session = recoverOfferwallSession(cookie);
  if (session?.status === "watching" && session.shown && !overlayVisible) {
    updateOfferwallSession({ status: "completed" });
    return readOfferwallSession();
  }
  return session;
}
