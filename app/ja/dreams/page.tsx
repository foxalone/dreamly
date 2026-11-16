import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DreamTopics from "../_components/DreamTopics";
import { japaneseMetadata } from "../_components/metadata";
import styles from "../pilot.module.css";

export const metadata = japaneseMetadata(
  "/dreams",
  "夢占い辞典｜よく見る夢の意味を場面別に解説｜Dreamly",
  "歯が抜ける夢、追いかけられる夢、地震の夢など、よく検索される夢を場面別に解説します。",
);

export default function JapaneseDreamDictionary() {
  return (
    <main className={styles.main}>
      <section className={styles.hero} aria-labelledby="japanese-dictionary-title">
        <h1 id="japanese-dictionary-title">夢占い辞典</h1>
        <p>覚えている場面から探してみましょう。同じ出来事でも、夢の中でどう感じたかによって受け取り方が変わります。</p>
      </section>
      <DreamTopics />
      <Link href="/ja#dream-form" className={styles.articleAction}>
        AIで自分の夢を読み解く <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </main>
  );
}
