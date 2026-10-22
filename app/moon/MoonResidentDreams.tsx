"use client";
import { useEffect, useRef, useState } from "react";
import type { MoonPin } from "@/lib/moon/model";
import type { PublicLunarDream } from "@/lib/moon/publicDreams";
import type { Locale } from "@/lib/i18n/config";
import { auth } from "@/lib/firebase";
import { moonResidentMessages } from "@/lib/i18n/moon-resident";
import { moonAccessMessages } from "@/lib/i18n/moon-access";
import styles from "./MoonGlobe.module.css";

export default function MoonResidentDreams({ resident, locale, onClose }: { resident: MoonPin; locale: Locale; onClose: () => void }) {
  const m = moonResidentMessages[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const [dreams, setDreams] = useState<PublicLunarDream[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("AUTH_REQUIRED");
        const response = await fetch("/api/moon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: await user.getIdToken(), resident: resident.id }), signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("DREAMS_UNAVAILABLE");
        const data = await response.json();
        if (!Array.isArray(data.dreams)) throw new Error("ACCESS_REQUIRED");
        if (!controller.signal.aborted) setDreams(data.dreams);
      } catch { if (!controller.signal.aborted) setError(true); }
    })();
    return () => controller.abort();
  }, [resident.id, attempt]);
  return <dialog ref={dialog} className={styles.dreamsDialog} aria-labelledby="resident-dreams-title" onClose={onClose} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }} dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className={styles.dreamsHeader}>
      <h2 id="resident-dreams-title">{m.title}</h2>
      <button type="button" onClick={onClose} aria-label={moonAccessMessages[locale].close}>×</button>
    </div>
    <div className={styles.dreamsBody}>
      {error ? <p role="alert">{m.error} <button onClick={() => { setError(false); setAttempt(n => n + 1); }}>{m.retry}</button></p> : dreams === null ? <p role="status">{m.loading}</p> : dreams.length === 0 ? <p>{m.empty}</p> : dreams.map(dream => <article key={dream.id}>
        {dream.sharedAtMs > 0 ? <time dateTime={new Date(dream.sharedAtMs).toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(dream.sharedAtMs)}</time> : null}
        {dream.emojis.length ? <p className={styles.cardEmojis}>{dream.emojis.join(" ")}</p> : null}
        <p className={styles.dreamText} dir="auto">{dream.text}</p>
      </article>)}
    </div>
  </dialog>;
}
