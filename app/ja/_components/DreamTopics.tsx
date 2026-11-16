import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { JA_DREAM_ARTICLES } from "@/lib/jaPilotContent";
import { JA_PILOT_SLUGS, type JaPilotSlug } from "@/lib/jaPilotPaths";
import styles from "../pilot.module.css";

export default function DreamTopics({ exclude }: { exclude?: JaPilotSlug }) {
  return (
    <ul className={styles.topics}>
      {JA_PILOT_SLUGS.filter((slug) => slug !== exclude).map((slug) => {
        const { name, icon } = JA_DREAM_ARTICLES[slug];
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
