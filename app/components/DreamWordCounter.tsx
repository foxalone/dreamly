"use client";

import { useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { DREAM_MAX_WORDS, countDreamWords } from "@/lib/dreamLength";

/** "123/350 words" under a dream box; `fullClassName` applies at the limit. */
export default function DreamWordCounter({ text, fullClassName = "" }: { text: string; fullClassName?: string }) {
  const t = useMessages();
  const n = countDreamWords(text);
  return (
    <span className={n >= DREAM_MAX_WORDS ? fullClassName : ""}>
      {formatMessage(t.app.wordCount, { n, max: DREAM_MAX_WORDS })}
    </span>
  );
}
