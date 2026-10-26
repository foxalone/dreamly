import { ArrowRight, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { horoscopeCopy } from "@/lib/i18n/horoscope";
import { SIGNS, SYMBOLS } from "@/lib/horoscope/model";
import LocaleLink from "@/lib/i18n/LocaleLink";
import ZodiacArt from "@/app/horoscope/ZodiacArt";
import styles from "./HomeHoroscope.module.css";

export default function HomeHoroscope({ locale }: { locale: Locale }) {
  const t = horoscopeCopy[locale];
  return <section id="horoscope" aria-labelledby="home-horoscope-title" className={styles.section} dir={locale === "ar" ? "rtl" : undefined}>
    <div className={styles.card}>
      <div className={styles.intro}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.nav} · Dreamly</p>
          <h2 id="home-horoscope-title">{t.title}</h2>
          <p className={styles.lead}>{t.lead}</p>
          <ul className={styles.topics}>
            {[t.fields.love, t.fields.career, t.fields.energy].map(topic => <li key={topic}>{topic}</li>)}
          </ul>
          <LocaleLink href="/horoscope" className={styles.cta}>{t.choose}<ArrowRight size={17} aria-hidden="true" /></LocaleLink>
        </div>
        <div className={styles.art}><ZodiacArt /></div>
      </div>
      <nav className={styles.signs} aria-label={t.choose}>
        {SIGNS.map((sign, index) => <LocaleLink key={sign} href={`/horoscope/${sign}`}><span aria-hidden="true">{SYMBOLS[index]}</span>{t.signs[sign]}</LocaleLink>)}
      </nav>
    </div>
  </section>;
}
