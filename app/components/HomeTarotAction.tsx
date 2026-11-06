"use client";

import type { ReactNode } from "react";
import styles from "./HomeTarotIntro.module.css";

export default function HomeTarotAction({ label, children }: { label: string; children: ReactNode }) {
  return <button type="button" className={styles.action} onClick={() => window.dispatchEvent(new Event("dreamly:open-tarot"))}>
    {label}{children}
  </button>;
}
