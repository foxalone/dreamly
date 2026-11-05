import Image from "next/image";
import type { MajorArcana } from "@/lib/tarot/deck";
import styles from "./TarotCardFace.module.css";

/** The same card face can be used in the admin gallery and a future daily draw. */
export function TarotCardFace({ card, name, large = false }: { card: MajorArcana; name: string; large?: boolean }) {
  return <div className={`${styles.card} ${large ? styles.large : ""}`}>
    <Image
      src={`/tarot/major-arcana/${card.id}.webp`}
      alt=""
      fill
      sizes={large ? "(max-width: 390px) calc(100vw - 32px), 360px" : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 180px"}
      className={styles.artwork}
    />
    <span className={styles.artworkShade} aria-hidden="true" />
    <span className={styles.frame} aria-hidden="true" />
    <span className={styles.number}>{card.numeral}</span>
    <span className={`${styles.corner} ${styles.cornerTopLeft}`} aria-hidden="true" />
    <span className={`${styles.corner} ${styles.cornerTopRight}`} aria-hidden="true" />
    <span className={`${styles.corner} ${styles.cornerBottomLeft}`} aria-hidden="true" />
    <span className={`${styles.corner} ${styles.cornerBottomRight}`} aria-hidden="true" />
    <span className={styles.sideMark} aria-hidden="true">✧</span>
    <span className={`${styles.sideMark} ${styles.sideMarkRight}`} aria-hidden="true">✧</span>
    <span className={styles.titleStar} aria-hidden="true">✦</span>
    <span className={styles.name} dir="auto">{name}</span>
  </div>;
}
