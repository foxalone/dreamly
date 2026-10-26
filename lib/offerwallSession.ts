import { peekAdUnlockPending, safeNext } from "./adUnlock";

const KEY = "dreamly.offerwallSession";
type OfferwallSession = {
  pendingAtMs: number;
  dreamText: string;
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
    if (!pending?.dreamText || !raw) return null;
    const saved = JSON.parse(raw) as OfferwallSession;
    if (saved.pendingAtMs !== pending.atMs || saved.dreamText !== pending.dreamText || typeof saved.rewardId !== "string" ||
        typeof saved.initialEntitlement !== "string" || typeof saved.shown !== "boolean" ||
        !["watching", "completed", "granted"].includes(saved.status)) return null;
    return { ...saved, next: safeNext(saved.next) };
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
  if (!pending?.dreamText) return null;
  const session: OfferwallSession = {
    pendingAtMs: pending.atMs, dreamText: pending.dreamText, rewardId, next: safeNext(next),
    initialEntitlement: offerwallEntitlement(cookie), shown: false, status: "watching",
  };
  save(session);
  return session;
}

export function updateOfferwallSession(update: Partial<Pick<OfferwallSession, "shown" | "status">>) {
  const session = readOfferwallSession();
  if (session) save({ ...session, ...update });
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
