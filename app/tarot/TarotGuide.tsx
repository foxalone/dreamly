import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import DreamDictionaryHeader from "@/app/dreams/DreamDictionaryHeader";
import DictionaryFooter from "@/app/dreams/DictionaryFooter";
import { TarotCardFace } from "@/app/components/tarot/TarotCardFace";
import { LOCALE_META, SITE_URL, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { localeMetadata, localeOpenGraph } from "@/lib/i18n/page-locale";
import { MAJOR_ARCANA, tarotCopy, type MajorArcanaId } from "@/lib/tarot/deck";
import { tarotGuideCopy, tarotReflectionQuestion, tarotSymbolCue } from "@/lib/tarot/guide";
import { tarotReadings } from "@/lib/tarot/readings";
import styles from "./TarotGuide.module.css";

const published = "2026-11-06";
const cardPath = (id: MajorArcanaId) => `/tarot/cards/${id}`;

export function tarotHubMetadata(locale: Locale): Metadata {
  const copy = tarotGuideCopy[locale];
  return {
    title: copy.hubTitle,
    description: copy.hubDescription,
    ...localeMetadata("/tarot", locale),
    openGraph: { ...localeOpenGraph("/tarot", locale, copy.hubTitle, copy.hubDescription), locale: LOCALE_META[locale].ogLocale },
  };
}

export function tarotCardMetadata(locale: Locale, id: MajorArcanaId): Metadata {
  const name = tarotCopy[locale].cards[id];
  const title = tarotGuideCopy[locale].cardTitle(name);
  const description = tarotReadings[locale][id][0];
  const path = cardPath(id);
  return {
    title,
    description,
    ...localeMetadata(path, locale),
    openGraph: { ...localeOpenGraph(path, locale, title, description, "article"), locale: LOCALE_META[locale].ogLocale, images: [{ url: `/tarot/major-arcana/${id}.webp`, alt: name }] },
  };
}

function GuideShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <div className={`dream-dictionary ${styles.shell}`} dir={LOCALE_META[locale].dir}>
    <DreamDictionaryHeader />
    <main className={styles.main}>{children}</main>
    <DictionaryFooter />
  </div>;
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, "\\u003c") }} />;
}

export function TarotGuideHub({ locale }: { locale: Locale }) {
  const copy = tarotGuideCopy[locale];
  return <GuideShell locale={locale}>
    <JsonLd value={{ "@context": "https://schema.org", "@type": "CollectionPage", name: copy.hubTitle, description: copy.hubDescription, inLanguage: LOCALE_META[locale].htmlLang, url: `${SITE_URL}${localePath("/tarot", locale)}`, datePublished: published }} />
    <div className={styles.hero}>
      <p className={styles.eyebrow}><Sparkles size={19} aria-hidden="true" />{copy.guideTitle}</p>
      <h1>{copy.hubTitle}</h1>
      <p className={styles.lead}>{copy.guideIntro}</p>
      <div className={styles.steps}>
        {[copy.stepImage, copy.stepMeaning, copy.stepQuestion].map((step, index) => <p key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</p>)}
      </div>
    </div>
    <section className={styles.collection} aria-labelledby="tarot-cards-heading">
      <div className={styles.collectionHeading}><h2 id="tarot-cards-heading">{copy.browseTitle}</h2><span>0 — XXI</span></div>
      <div className={styles.grid}>
        {MAJOR_ARCANA.map(card => <Link className={styles.tile} href={localePath(cardPath(card.id), locale)} key={card.id} aria-label={copy.cardTitle(tarotCopy[locale].cards[card.id])}>
          <div className={styles.tileArt}><TarotCardFace card={card} name={tarotCopy[locale].cards[card.id]} /></div>
          <div className={styles.tileText}><span className={styles.numeral}>{card.numeral}</span><h3>{tarotCopy[locale].cards[card.id]}</h3><p>{tarotSymbolCue(locale, card.id)}</p><span className={styles.explore}>{copy.explore} <ArrowRight size={15} aria-hidden="true" /></span></div>
        </Link>)}
      </div>
    </section>
  </GuideShell>;
}

export function TarotGuideCard({ locale, id }: { locale: Locale; id: MajorArcanaId }) {
  const copy = tarotGuideCopy[locale];
  const cardIndex = MAJOR_ARCANA.findIndex(card => card.id === id);
  const card = MAJOR_ARCANA[cardIndex];
  const name = tarotCopy[locale].cards[id];
  const reading = tarotReadings[locale][id];
  const title = copy.cardTitle(name);
  const path = cardPath(id);
  const previous = MAJOR_ARCANA[(cardIndex - 1 + MAJOR_ARCANA.length) % MAJOR_ARCANA.length];
  const next = MAJOR_ARCANA[(cardIndex + 1) % MAJOR_ARCANA.length];
  return <GuideShell locale={locale}>
    <JsonLd value={{ "@context": "https://schema.org", "@type": "Article", headline: title, description: reading[0], inLanguage: LOCALE_META[locale].htmlLang, url: `${SITE_URL}${localePath(path, locale)}`, image: `${SITE_URL}/tarot/major-arcana/${id}.webp`, datePublished: published, publisher: { "@type": "Organization", name: "Dreamly", url: SITE_URL } }} />
    <article className={styles.article}>
      <Link className={styles.back} href={localePath("/tarot", locale)}><ArrowLeft size={18} aria-hidden="true" />{copy.back}</Link>
      <header className={styles.cardHero}>
        <div className={styles.cardArt}><TarotCardFace card={card} name={name} large /></div>
        <div className={styles.cardHead}>
          <p className={styles.eyebrow}><Sparkles size={18} aria-hidden="true" />{copy.generalMeaning} · {card.numeral}</p>
          <h1>{title}</h1>
          <p className={styles.lead}>{reading[0]}</p>
          <div className={styles.symbol}><h2>{copy.symbolism}</h2><p>{tarotSymbolCue(locale, id)}</p></div>
        </div>
      </header>
      <div className={styles.articleBody}>
        <h2>{copy.contexts}</h2>
        <div className={styles.contextGrid}>
          {([copy.relationships, copy.work, copy.resources, copy.innerLife] as const).map((heading, index) => <section className={styles.context} key={heading}><h3>{heading}</h3><p>{reading[index + 1]}</p></section>)}
        </div>
        <aside className={styles.reflection}><h2>{copy.reflection}</h2><p>{tarotReflectionQuestion(locale, id)}</p></aside>
      </div>
      <nav className={styles.cardNav} aria-label={copy.browseTitle}>
        <Link href={localePath(cardPath(previous.id), locale)}><ArrowLeft size={18} aria-hidden="true" /><span>{copy.previous}<strong>{tarotCopy[locale].cards[previous.id]}</strong></span></Link>
        <Link href={localePath("/tarot", locale)}>{copy.back}</Link>
        <Link href={localePath(cardPath(next.id), locale)}><span>{copy.next}<strong>{tarotCopy[locale].cards[next.id]}</strong></span><ArrowRight size={18} aria-hidden="true" /></Link>
      </nav>
    </article>
  </GuideShell>;
}
