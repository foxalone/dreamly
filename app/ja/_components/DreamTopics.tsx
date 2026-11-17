import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JA_WEB_DREAM_ARTICLES } from "@/lib/jaDreamArticles";
import { JA_WEB_DREAM_SLUGS } from "@/lib/jaPilotPaths";
import styles from "../pilot.module.css";

export default function DreamTopics({ exclude, limit }: { exclude?: string; limit?: number }) {
  const topics = JA_WEB_DREAM_SLUGS.filter((slug) => slug !== exclude).slice(0, limit);
  return (
    <ul className={styles.topics}>
      {topics.map((slug) => {
        const { name, icon } = JA_WEB_DREAM_ARTICLES[slug];
        return (
          <li key={slug}>
            <Link href={`/ja/dreams/${slug}`} className={styles.topic}>
              <span className={styles.topicIcon} aria-hidden="true">{icon}</span>
              <span>{name}</span>
              <ArrowUpRight size={17} className={styles.topicArrow} aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
