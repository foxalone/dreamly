"use client";

import Link from "next/link";
import { BookOpen, MessageCircle, NotebookPen } from "lucide-react";
import { isLocale } from "@/lib/i18n/config";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { getMessages } from "@/lib/i18n/messages";
import { localePath } from "@/lib/i18n/path";

type ComposeTab = "JOURNAL" | "STORIES";

export default function AnalysisActions({
  dreamText, language, onCompose,
}: {
  dreamText: string;
  language?: string | null;
  onCompose?: (tab: ComposeTab) => void;
}) {
  const locale = useLocale();
  const siteMessages = useMessages();
  const scriptLocale = /[\u0400-\u04FF]/.test(dreamText) ? "ru" : /[\u0600-\u06FF]/.test(dreamText) ? "ar" : null;
  const copy = (isLocale(language) ? getMessages(language) : scriptLocale ? getMessages(scriptLocale) : siteMessages).analysisActions;
  const journalPath = `${localePath("/app/dreams", locale)}?tab=journal`;
  const storyPath = `${localePath("/app/dreams", locale)}?tab=stories`;
  const cards = [
    { key: "journal", tab: "JOURNAL" as const, href: journalPath, icon: NotebookPen, title: copy.journalTitle, body: copy.journalBody, cta: copy.journalCta },
    { key: "story", tab: "STORIES" as const, href: storyPath, icon: BookOpen, title: copy.storyTitle, body: copy.storyBody, cta: copy.storyCta },
    { key: "conversation", tab: null, href: localePath("/app/shared", locale), icon: MessageCircle, title: copy.conversationTitle, body: copy.conversationBody, cta: copy.conversationCta },
  ];

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {cards.map(({ key, tab, href, icon: Icon, title, body, cta }) => (
        <article key={key} dir="auto" className="rounded-2xl border border-purple-400/30 bg-purple-500/5 p-4 text-start">
          <Icon size={20} className="mb-2 text-purple-500" aria-hidden />
          <h4 className="text-sm font-semibold text-[var(--text)]">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{body}</p>
          {tab && onCompose ? (
            <button type="button" onClick={() => onCompose(tab)} className="mt-3 text-sm font-semibold text-purple-500 underline underline-offset-4">{cta}</button>
          ) : (
            <Link href={href} className="mt-3 inline-block text-sm font-semibold text-purple-500 underline underline-offset-4">{cta}</Link>
          )}
        </article>
      ))}
    </div>
  );
}
