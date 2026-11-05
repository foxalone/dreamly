import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, House, Orbit } from "lucide-react";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { notFoundCopy } from "@/lib/i18n/notFound";
import { localePath } from "@/lib/i18n/path";
import styles from "./MoonNotFound.module.css";

export default function MoonNotFound({ locale }: { locale: Locale }) {
  const copy = notFoundCopy[locale];
  const destinations = [
    { href: "/", title: copy.home, detail: copy.homeDetail, icon: House },
    { href: "/app/shared", title: copy.feed, detail: copy.feedDetail, icon: Heart },
    { href: "/horoscope", title: copy.horoscope, detail: copy.horoscopeDetail, icon: Orbit },
  ];

  return <main className={styles.page} lang={LOCALE_META[locale].htmlLang.replace("_", "-")} dir={LOCALE_META[locale].dir} data-floating-obstacle data-not-found>
    <div className={styles.stars} aria-hidden="true" />
    <div className={styles.container}>
      <div className={styles.brand}><span aria-hidden="true">☾</span> Dreamly</div>
      <div className={styles.hero}>
        <div className={styles.message}>
          <span className={styles.eyebrow}><span aria-hidden="true">✧</span> {copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>

        <div className={styles.scene} aria-hidden="true">
          <div className={styles.sceneGlow} />
          <div className={styles.imageFrame}>
            <Image src="/launch/moon.webp" alt="" fill priority sizes="(max-width: 800px) 78vw, 380px" className={styles.moonImage} />
            <div className={styles.imageShade} />
          </div>
          <div className={styles.orbit} />
          <div className={styles.escapedPage}><span className={styles.pageFold} /><span>404</span><i>✦</i></div>
          <span className={`${styles.sparkle} ${styles.sparkleOne}`}>✦</span>
          <span className={`${styles.sparkle} ${styles.sparkleTwo}`}>✧</span>
          <span className={`${styles.sparkle} ${styles.sparkleThree}`}>✦</span>
        </div>
      </div>

      <nav className={styles.destinations} aria-label={copy.next}>
        {destinations.map(({ href, title, detail, icon: Icon }) => <Link key={href} href={localePath(href, locale)} className={styles.destination}>
          <span className={styles.destinationIcon}><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
          <span className={styles.destinationText}><strong>{title}</strong><small>{detail}</small></span>
          <ArrowUpRight className={styles.arrow} size={20} aria-hidden="true" />
        </Link>)}
      </nav>
    </div>
  </main>;
}
