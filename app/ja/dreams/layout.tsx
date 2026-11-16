import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "../pilot.module.css";

export default function JapanesePilotLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site} lang="ja">
      <header className={styles.header}>
        <Link href="/ja" className={styles.brand}>
          <Image src="/icon-192.png" alt="" width={30} height={30} />
          Dreamly
        </Link>
        <nav aria-label="メインメニュー">
          <Link href="/ja/dreams">夢占い辞典</Link>
          <Link href="/" hrefLang="en" lang="en">English</Link>
        </nav>
      </header>
      {children}
      <footer className={styles.footer}>
        <p>夢の解釈は、気持ちや記憶を振り返るためのヒントです。医学的な診断や未来の予測はできません。</p>
        <Link href="/ja/privacy" hrefLang="ja">プライバシーポリシー</Link>
      </footer>
    </div>
  );
}
