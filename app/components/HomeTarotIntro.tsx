import { ArrowUpRight, Sparkles } from "lucide-react";
import { TarotCardFace } from "@/app/components/tarot/TarotCardFace";
import type { Locale } from "@/lib/i18n/config";
import { horoscopeTarotCopy } from "@/lib/i18n/horoscope-tarot";
import { MAJOR_ARCANA, tarotCopy } from "@/lib/tarot/deck";
import HomeTarotAction from "./HomeTarotAction";
import { localePath } from "@/lib/i18n/path";
import Link from "next/link";
import styles from "./HomeTarotIntro.module.css";

const cards = ["star", "moon", "sun"] as const;

export default function HomeTarotIntro({ locale }: { locale: Locale }) {
  const copy = horoscopeTarotCopy[locale];
  return <section id="tarot" className={styles.section} aria-labelledby="home-tarot-title" dir={locale === "ar" ? "rtl" : undefined}>
    <div className={styles.copy}>
      <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" />{copy.eyebrow}</p>
      <h2 id="home-tarot-title">{copy.title}</h2>
      <p className={styles.intro}>{copy.intro}</p>
      <div className={styles.actions}>
        <HomeTarotAction label={copy.action}><ArrowUpRight size={18} aria-hidden="true" /></HomeTarotAction>
        <Link className={styles.action} href={localePath("/tarot", locale)}>{copy.guideAction}<ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
    </div>
    <div className={styles.cards}>
      {cards.map(id => {
        const card = MAJOR_ARCANA.find(item => item.id === id)!;
        return <div className={styles.card} key={id}>
          <TarotCardFace card={card} name={tarotCopy[locale].cards[id]} />
          <span>{copy[id]}</span>
        </div>;
      })}
    </div>
  </section>;
}
