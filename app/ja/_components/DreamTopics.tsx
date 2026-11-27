import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JA_WEB_DREAM_ARTICLES } from "@/lib/jaDreamArticles";
import { JA_WEB_DREAM_SLUGS, type JaWebDreamSlug } from "@/lib/jaPilotPaths";
import styles from "../pilot.module.css";

export default function DreamTopics({ slugs = JA_WEB_DREAM_SLUGS }: { slugs?: readonly JaWebDreamSlug[] }) {
  return (
    <ul className={styles.topics}>
      {slugs.map((slug) => {
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
