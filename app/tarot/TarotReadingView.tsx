import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, BriefcaseBusiness, Wallet, Moon } from "lucide-react";
import { GUEST_COOKIE } from "@/app/api/dreams/_lib/guestQuota";
import { TarotCardFace } from "@/app/components/tarot/TarotCardFace";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { tarotReadingCopy } from "@/lib/i18n/tarotReading";
import { localeMetadata } from "@/lib/i18n/page-locale";
import { localePath } from "@/lib/i18n/path";
import { canReadTarotAccess, canReadTarotUnlock, isTarotCardId, TAROT_ACCESS_COOKIE, TAROT_UNLOCK_COOKIE } from "@/lib/tarot/access";
import { getDailyTarotReading } from "@/lib/tarot/dailyReading";
import { MAJOR_ARCANA, tarotCopy } from "@/lib/tarot/deck";
import styles from "./TarotReadingView.module.css";

export function tarotReadingMetadata(locale: Locale, day: string, cardId: string): Metadata {
  const copy = tarotReadingCopy[locale];
  return {
    title: `${copy.eyebrow} | Dreamly`,
    description: copy.description,
    ...localeMetadata(`/tarot/${day}/${cardId}`, locale),
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function TarotReadingView({ locale, day, cardId }: { locale: Locale; day: string; cardId: string }) {
  const jar = await cookies();
  if (!canReadTarotAccess(
    jar.get(TAROT_ACCESS_COOKIE)?.value,
    jar.get(GUEST_COOKIE)?.value,
    day,
    cardId,
    process.env.CRON_SECRET?.trim(),
  ) || !canReadTarotUnlock(
    jar.get(TAROT_UNLOCK_COOKIE)?.value,
    jar.get(GUEST_COOKIE)?.value,
    day,
    cardId,
    process.env.CRON_SECRET?.trim(),
  )) notFound();
  if (!isTarotCardId(cardId)) notFound();

  const card = MAJOR_ARCANA.find(item => item.id === cardId)!;
  const copy = tarotReadingCopy[locale];
  const name = tarotCopy[locale].cards[cardId];
  const { overview, relationships, work, resources, innerLife, reflection } = await getDailyTarotReading(day, cardId, locale);
  const languageTag = LOCALE_META[locale].htmlLang.replace("_", "-");
  const date = new Intl.DateTimeFormat(languageTag, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  const sections = [
    { title: copy.relationships, text: relationships, icon: Heart },
    { title: copy.work, text: work, icon: BriefcaseBusiness },
    { title: copy.resources, text: resources, icon: Wallet },
    { title: copy.innerLife, text: innerLife, icon: Moon },
  ];

  return <main className={styles.page} lang={languageTag} dir={LOCALE_META[locale].dir}>
    <div className={styles.stars} aria-hidden="true" />
    <div className={styles.container}>
      <header className={styles.top}>
        <Link href={localePath("/app/shared", locale)} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{copy.back}</Link>
        <span className={styles.brand}><span aria-hidden="true">✦</span> Dreamly</span>
      </header>

      <div className={styles.layout}>
        <div className={styles.visual}>
          <div className={styles.cardGlow} aria-hidden="true" />
          <div className={styles.card}><TarotCardFace card={card} name={name} large /></div>
        </div>

        <article className={styles.reading}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>{copy.eyebrow} <span aria-hidden="true">·</span> <time dateTime={day}>{date}</time></p>
            <h1>{name}</h1>
            <p className={styles.subtitle}>{copy.heading}</p>
            <p className={styles.lead}>{overview}</p>
          </div>

          <p className={styles.sectionLead}>{copy.subtitle}</p>
          <div className={styles.lenses}>
            {sections.map(({ title, text, icon: Icon }) => <section className={styles.lens} key={title}>
              <div className={styles.lensHead}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /><h2>{title}</h2></div>
              <p>{text}</p>
            </section>)}
          </div>
        </article>
      </div>

      <section className={styles.reflection}>
        <div><span className={styles.reflectionStar} aria-hidden="true">✧</span><h2>{copy.reflection}</h2></div>
        <p>{reflection}</p>
      </section>
      <p className={styles.note}>{copy.note}</p>
    </div>
  </main>;
}
