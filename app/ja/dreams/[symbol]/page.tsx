import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getJapaneseDreamArticle } from "@/lib/jaDreamArticles";
import { JA_WEB_DREAM_SLUGS } from "@/lib/jaPilotPaths";
import DreamTopics from "../../_components/DreamTopics";
import JapaneseDreamForm from "../../_components/JapaneseDreamForm";
import { japaneseMetadata } from "../../_components/metadata";
import styles from "../../pilot.module.css";

type Props = { params: Promise<{ symbol: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return JA_WEB_DREAM_SLUGS.map((symbol) => ({ symbol }));
}

function getArticle(symbol: string) {
  const article = getJapaneseDreamArticle(symbol);
  if (!article) notFound();
  return article;
}

export async function generateMetadata({ params }: Props) {
  const { slug, name, summary } = getArticle((await params).symbol);
  return japaneseMetadata(`/dreams/${slug}`, `【夢占い】${name}の意味｜Dreamly`, summary, "article");
}

export default async function JapaneseDreamArticle({ params }: Props) {
  const { slug, name, icon, summary, scenes, reflection } = getArticle((await params).symbol);
  return (
    <main className={styles.main}>
      <Link href="/ja/dreams" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" /> 夢占い辞典
      </Link>
      <article>
        <header className={styles.articleHeader}>
          <span className={styles.articleIcon} aria-hidden="true">{icon}</span>
          <h1>{name}の意味</h1>
          <p>{summary}</p>
          <a href="#dream-form" className={styles.articleAction}>自分の夢をAIで読み解く ↓</a>
        </header>
        <section className={styles.scenes} aria-labelledby="dream-scenes-title">
          <h2 id="dream-scenes-title">場面別の読み解き方</h2>
          {scenes.map(({ title, text }) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
          <p className={styles.reflection}>{reflection}</p>
        </section>
      </article>
      <JapaneseDreamForm returnTo={`/ja/dreams/${slug}`} symbol={slug} />
      <section className={styles.topicSection} aria-labelledby="more-dreams-title">
        <h2 id="more-dreams-title">ほかの夢を調べる</h2>
        <DreamTopics exclude={slug} limit={6} />
      </section>
    </main>
  );
}
