"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { isDreamlyAndroidApp } from "@/lib/auth/isDreamlyAndroidApp";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { androidInstallCopy, type AndroidInstallCopy } from "@/lib/i18n/androidInstall";
import { isLocaleExemptPath, stripLocalePrefix } from "@/lib/i18n/path";
import styles from "./AndroidInstallBanner.module.css";

const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=art.dreamly.app";
const SESSION_KEY = "dreamly:android-install-dismissed";
const SHOW_DELAY_MS = 3000;
const EXCLUDED_PATHS = ["/signin", "/payment-success", "/ad/unlock", "/app/game"];
let dismissedInDocument = false;

function AndroidInstallNotice({ copy }: { copy: AndroidInstallCopy }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dismissedInDocument || isDreamlyAndroidApp()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // The banner still works in this document when storage is blocked.
    }

    let timer: number | undefined;
    const show = () => {
      if (dismissedInDocument || document.visibilityState !== "visible" || document.querySelector("[data-not-found]")) return;
      setVisible(true);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === "visible") timer = window.setTimeout(show, SHOW_DELAY_MS);
    };
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    dismissedInDocument = true;
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // The dismissal still applies to client-side navigation in this document.
    }
  };
  return (
    <div className={styles.layer}>
      <aside className={styles.banner} aria-label={copy.title}>
        <p className={styles.title}>{copy.title}</p>
        <button className={styles.dismiss} type="button" onClick={dismiss} aria-label={copy.close}>
          <X aria-hidden="true" size={19} />
        </button>
        <a className={styles.store} href={GOOGLE_PLAY_URL} onClick={dismiss}>
          <Image src={`/google-play/${copy.badge}.png`} alt={copy.get} width={646} height={250} unoptimized />
        </a>
      </aside>
    </div>
  );
}

export default function AndroidInstallBanner() {
  const pathname = usePathname() || "/";
  const { path } = stripLocalePrefix(pathname);
  const copy = androidInstallCopy[useLocale()];
  if (!copy || isLocaleExemptPath(path) || EXCLUDED_PATHS.some(prefix => path === prefix || path.startsWith(prefix + "/"))) return null;
  return <AndroidInstallNotice key={pathname} copy={copy} />;
}
