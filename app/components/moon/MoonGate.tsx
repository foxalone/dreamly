"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { localePath, stripLocalePrefix } from "@/lib/i18n/path";
import { analyzeDreamMessages } from "@/lib/i18n/first-dream";
import { moonAccessMessages } from "@/lib/i18n/moon-access";
import type { MoonAccess } from "@/lib/moon/model";
import styles from "./MoonGate.module.css";

export default function MoonGate({ portal = false, children }: { portal?: boolean; children?: (access: MoonAccess) => ReactNode }) {
  const { locale } = stripLocalePrefix(usePathname());
  const m = moonAccessMessages[locale];
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState<MoonAccess | null>(null);
  const [open, setOpen] = useState(!portal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const generation = useRef(0);
  useEffect(() => onAuthStateChanged(auth, value => {
    generation.current++;
    setUser(value); setAuthReady(true); setAccess(null); setError(false); setBusy(false);
  }), []);
  const check = useCallback(async (join = false) => {
    if (!user) return;
    const requestGeneration = generation.current;
    setBusy(true); setError(false);
    try {
      const result = await fetch("/api/moon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: await user.getIdToken(), join, pins: !portal }), cache: "no-store" });
      if (!result.ok) throw new Error("Moon access");
      const next: MoonAccess = await result.json();
      if (requestGeneration !== generation.current) return;
      setAccess(next);
      if (join && portal && next.eligible && next.joined) window.location.assign(localePath("/moon", locale));
      return next;
    } catch { if (requestGeneration === generation.current) setError(true); }
    finally { if (requestGeneration === generation.current) setBusy(false); }
  }, [user, portal, locale]);
  useEffect(() => {
    if (portal) return;
    void check();
    // Refresh characters and recheck eligibility while the Moon is open.
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void check(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [check, portal]);
  const unlocked = !portal && access?.joined && access.eligible;
  const resolving = !portal && (!authReady || (user !== null && access === null && !error));
  useEffect(() => {
    if (open && !unlocked && !resolving) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open, unlocked, resolving]);
  async function openPortal() {
    if (!user) { setOpen(true); return; }
    const next = await check();
    if (next?.eligible && next.joined) {
      window.location.assign(localePath("/moon", locale));
      return;
    }
    setOpen(true);
  }
  function close() {
    if (portal) setOpen(false);
    else window.location.assign(localePath("/app/map", locale));
  }
  return <>
    {portal ? <button className={styles.portal} onClick={() => void openPortal()} disabled={!authReady || busy} aria-busy={busy} aria-label={m.open} title={busy ? m.loading : m.open}>
      <span className={styles.orb} aria-hidden />
      <span className={styles.particles} aria-hidden>{["🦋", "🦄", "🐉", "🧚", "🐈", "🕊️"].map((emoji, index) => <span key={emoji} style={{ "--i": index } as React.CSSProperties}>{emoji}</span>)}</span>
    </button> : unlocked ? children?.(access) : <div className={styles.backdrop} role="status">{resolving ? m.loading : null}</div>}
    <dialog ref={dialog} aria-labelledby="moon-access-title" className={styles.dialog} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }}>
      <div className={styles.panel} dir={locale === "ar" ? "rtl" : undefined}>
        <button className={styles.close} aria-label={m.close} onClick={close}>×</button>
        <h2 id="moon-access-title">{m.title}</h2>
        <p>{m.rule}</p>
        {(!authReady || busy) ? <p role="status">{m.loading}</p> : null}
        {error ? <p role="alert">{m.error} <button onClick={() => void check()}>{m.retry}</button></p> : null}
        {access ? <p>{m.progress.replace("{count}", String(access.count))}</p> : null}
        {access?.eligible ? <p className={styles.consent}>{m.consent}</p> : null}
        <div className={styles.actions}>
          {access?.eligible ? (
            access.joined ? <a href={localePath("/moon", locale)}>{m.enter}</a> : <button disabled={busy} onClick={() => void check(true)}>{m.enter}</button>
          ) : (
            <a href={localePath("/app/dreams", locale)}>{analyzeDreamMessages[locale]}</a>
          )}
        </div>
      </div>
    </dialog>
  </>;
}
