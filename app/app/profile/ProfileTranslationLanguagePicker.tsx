"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Check, ChevronDown, Languages, X } from "lucide-react";
import { firestore } from "@/lib/firebase";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { TRANSLATION_LANGUAGES, type TranslationLanguage } from "@/lib/translationLanguage";
import styles from "./ProfileTranslationLanguagePicker.module.css";

type Props = {
  user: User | null;
  preference: TranslationLanguage | null;
  browserLanguage: TranslationLanguage;
  ready: boolean;
};

export default function ProfileTranslationLanguagePicker({ user, preference, browserLanguage, ready }: Props) {
  const locale = useLocale();
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<{ value: TranslationLanguage | null } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selected = pending ? pending.value : preference;
  const browserLabel = formatMessage(t.profile.browserLanguage, { language: TRANSLATION_LANGUAGES[browserLanguage] });
  const selectedLabel = selected ? TRANSLATION_LANGUAGES[selected] : browserLabel;

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      (dialogRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? dialogRef.current?.querySelector<HTMLButtonElement>("button"))?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab") return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons?.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  async function choose(value: TranslationLanguage | null) {
    if (!user || saving) return;
    setPending({ value });
    setError(false);
    setSaving(true);
    close();
    try {
      await setDoc(doc(firestore, "users", user.uid), { preferredTranslationLanguage: value }, { merge: true });
    } catch {
      setError(true);
    } finally {
      setPending(null);
      setSaving(false);
    }
  }

  return <>
    <div className={styles.wrapper}>
      <button type="button" ref={triggerRef} className={styles.trigger} disabled={!user || !ready || saving} aria-haspopup="dialog" aria-expanded={open} aria-controls="profile-language-dialog" aria-label={`${t.profile.preferredLanguage}: ${selectedLabel}`} onClick={() => setOpen(true)}>
        <span className={styles.icon}><Languages size={20} strokeWidth={1.8} aria-hidden="true" /></span>
        <span className={styles.triggerText}>{selectedLabel}</span>
        <ChevronDown className={styles.chevron} size={19} aria-hidden="true" />
      </button>
      {saving ? <p role="status" className={styles.status}>{t.profile.languageSaving}</p> : null}
      {error ? <p role="alert" className={styles.error}>{t.profile.languageSaveError}</p> : null}
    </div>
    {open ? createPortal(<div className={styles.overlay} onPointerDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div id="profile-language-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="profile-language-title" className={styles.dialog} dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className={styles.header}>
          <h2 id="profile-language-title" className={styles.title}>{t.profile.preferredLanguage}</h2>
          <button type="button" className={styles.close} aria-label={t.profile.closeLanguagePicker} onClick={close}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className={styles.grid}>
          <button type="button" className={`${styles.option} ${selected === null ? styles.optionSelected : ""}`} aria-pressed={selected === null} onClick={() => void choose(null)}>
            <span className={styles.optionText}>{browserLabel}</span>
            {selected === null ? <Check className={styles.check} size={18} aria-hidden="true" /> : null}
          </button>
          {Object.entries(TRANSLATION_LANGUAGES).map(([code, name]) => {
            const value = code as TranslationLanguage;
            return <button type="button" key={code} className={`${styles.option} ${selected === value ? styles.optionSelected : ""}`} aria-pressed={selected === value} onClick={() => void choose(value)}>
              <span className={styles.optionText} lang={code === "pt" ? "pt-BR" : code}>{name}</span>
              {selected === value ? <Check className={styles.check} size={18} aria-hidden="true" /> : null}
            </button>;
          })}
        </div>
      </div>
    </div>, document.body) : null}
  </>;
}
