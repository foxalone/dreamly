"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { clearOfferwallEntitlement } from "@/lib/adUnlock";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { signInWithOptions } from "@/lib/auth/signInWithOptions";
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { tarotAccessCopy } from "@/lib/i18n/tarotAccess";
import type { MajorArcanaId } from "@/lib/tarot/deck";
import PlansModal from "../PlansModal";
import styles from "./TarotAccessDialog.module.css";

type Info = { tier: "guest" | "member" | "paid"; unlocked: boolean; firstFreeAvailable: boolean };
type Props = { day: string; cardId: MajorArcanaId; locale: Locale; onClose: () => void };

export function TarotAccessDialog({ day, cardId, locale, onClose }: Props) {
  const router = useRouter();
  const copy = tarotAccessCopy[locale];
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [plans, setPlans] = useState(false);
  const readingUrl = localePath(`/tarot/${day}/${cardId}`, locale);

  const headersFor = useCallback(async (user: User | null, body = false) => ({
    "x-tarot-request": "1",
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
  }), []);

  const load = useCallback(async () => {
    setBusy(true); setError(false);
    try {
      await auth.authStateReady();
      const response = await fetch(`/api/tarot/access?day=${encodeURIComponent(day)}&cardId=${encodeURIComponent(cardId)}`, {
        headers: await headersFor(auth.currentUser), credentials: "same-origin", cache: "no-store",
      });
      if (!response.ok) throw new Error("access status failed");
      const result = await response.json() as Info;
      if (result.unlocked) { window.location.assign(readingUrl); return; }
      if (result.tier === "paid" || result.firstFreeAvailable) {
        const unlock = await fetch("/api/tarot/access", {
          method: "POST", headers: await headersFor(auth.currentUser, true), credentials: "same-origin",
          body: JSON.stringify({ day, cardId }),
        });
        if (unlock.ok) { window.location.assign(readingUrl); return; }
        if (unlock.status !== 402) throw new Error("automatic tarot unlock failed");
        setInfo({ tier: "member", unlocked: false, firstFreeAvailable: false });
        return;
      }
      setInfo(result);
    } catch { setError(true); }
    finally { setBusy(false); }
  }, [day, cardId, headersFor, readingUrl]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !plans) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, plans]);

  async function openReading(user: User | null) {
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/tarot/access", {
        method: "POST", headers: await headersFor(user, true), credentials: "same-origin",
        body: JSON.stringify({ day, cardId }),
      });
      if (response.ok) { window.location.assign(readingUrl); return; }
      if (response.status === 402) { await load(); return; }
      throw new Error("tarot unlock failed");
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  async function signIn() {
    setBusy(true); setError(false);
    try {
      const credential = await signInWithOptions();
      if (!credential) return;
      await ensureUserProfileOnSignIn(credential.user);
      await openReading(credential.user);
    } catch (cause) {
      if ((cause as { code?: string }).code !== "auth/popup-closed-by-user") setError(true);
    } finally { setBusy(false); }
  }

  async function watchAd() {
    setBusy(true); setError(false);
    try {
      await auth.authStateReady();
      const response = await fetch("/api/tarot/ad", {
        method: "POST", headers: await headersFor(auth.currentUser, true), credentials: "same-origin",
        body: JSON.stringify({ action: "start", day, cardId }),
      });
      if (response.status === 409) { await load(); return; }
      if (!response.ok) throw new Error("ad start failed");
      const result = await response.json() as { challenge: string };
      if (!result.challenge) throw new Error("ad challenge missing");
      clearOfferwallEntitlement();
      const query = new URLSearchParams({ kind: "tarot", challenge: result.challenge, next: readingUrl, back: window.location.pathname + window.location.search, locale });
      router.push(`/ad/unlock?${query.toString()}`);
    } catch { setError(true); setBusy(false); }
  }

  const description = info?.tier === "guest" ? copy.guest : copy.adOrPlan;
  return createPortal(<>
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !plans) onClose(); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="tarot-access-title" dir={locale === "ar" ? "rtl" : "ltr"}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={copy.close}>×</button>
        <div className={styles.symbol} aria-hidden="true">✦</div>
        <h2 id="tarot-access-title">{copy.title}</h2>
        <p>{busy && !info ? copy.loading : description}</p>
        {error ? <p className={styles.error} role="alert">{copy.error}</p> : null}
        <div className={styles.actions}>
          {info?.tier === "guest" ? <button type="button" disabled={busy} onClick={() => void signIn()}>{copy.signIn}</button> : null}
          {info && info.tier !== "paid" ? <button type="button" className={styles.primary} disabled={busy} onClick={() => void watchAd()}>{copy.watchAd}</button> : null}
          {info && info.tier !== "paid" ? <button type="button" disabled={busy} onClick={() => setPlans(true)}>{copy.subscribe}</button> : null}
          {error && !info ? <button type="button" disabled={busy} onClick={() => void load()}>{copy.read}</button> : null}
        </div>
      </section>
    </div>
    <PlansModal open={plans} onClose={() => setPlans(false)} source="tarot_daily" title={copy.planTitle} body={copy.planBody} />
  </>, document.body);
}
