"use client";

import { Loader2, VenetianMask } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { getMessages } from "@/lib/i18n/messages";
import { isLocale } from "@/lib/i18n/config";
import { guestShareCopyFromMessages, type GuestShareCopy } from "@/lib/guestShareCopy";
import { nextShareBadge, shareBadgeFor } from "@/lib/shareBadges";
import type { AnonShareStatus } from "./useDreamAsk";

/**
 * Card under a homepage / inline reading: "Share this dream anonymously?"
 * A guest gets 🦄 right away and is nudged to sign in to keep it.
 */
export default function ShareAnonPrompt({
  status,
  onShare,
  onSignIn,
  copy,
  analysisLanguage,
  dreamText,
}: {
  status: AnonShareStatus;
  onShare: () => void;
  onSignIn: () => void;
  copy?: GuestShareCopy | null;
  analysisLanguage?: string | null;
  dreamText?: string;
}) {
  const t = useMessages();
  const first = shareBadgeFor(1);
  const after = nextShareBadge(1)?.badge ?? first;
  // Older saved dreams predate the cached AI copy. Use their script when it
  // identifies an existing site translation, including the Russian case.
  const oldReadingLocale = !analysisLanguage && /[\u0400-\u04FF]/.test(dreamText ?? "") ? "ru" : !analysisLanguage && /[\u0600-\u06FF]/.test(dreamText ?? "") ? "ar" : null;
  const readingLocale = isLocale(analysisLanguage) ? analysisLanguage : oldReadingLocale;
  const promptMessages = readingLocale ? getMessages(readingLocale) : t;
  const translated = copy ?? guestShareCopyFromMessages(promptMessages);
  const direction = readingLocale === "ar" ? "rtl" : undefined;

  if (status === "done" || status === "already") {
    return (
      <div dir={direction} className="mt-4 rounded-2xl border border-purple-300/50 bg-purple-50/60 p-4 text-sm text-zinc-800 dark:bg-purple-500/10 dark:text-[var(--text)]">
        <p dir="auto">
          {status === "done"
            ? formatMessage(translated.done, {
                badge: `${first.emoji} ${translated.unicorn}`,
                next: `${after.emoji} ${translated.wizard}`,
              })
            : translated.already}
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-3 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
        >
          {translated.signIn}
        </button>
      </div>
    );
  }

  return (
    <div dir={direction} className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-start">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {first.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{translated.promptTitle ?? promptMessages.shareBadges.promptTitle}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {formatMessage(translated.promptBody ?? promptMessages.shareBadges.promptBody, {
              badge: `${first.emoji} ${translated.promptBody ? translated.unicorn : promptMessages.shareBadges.names.unicorn}`,
            })}
          </p>
        </div>
      </div>
      {status === "rejected" || status === "failed" ? (
        <p className="mt-3 text-xs text-red-500" role="alert">
          {status === "rejected" ? promptMessages.shareBadges.rejected : promptMessages.shareBadges.failed}
        </p>
      ) : null}
      {status !== "rejected" ? (
        <button
          type="button"
          onClick={onShare}
          disabled={status === "busy"}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-70"
        >
          {status === "busy" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <VenetianMask size={16} aria-hidden />
          )}
          {status === "busy" ? translated.sharing ?? promptMessages.shareBadges.sharing : translated.shareCta ?? promptMessages.shareBadges.shareCta}
        </button>
      ) : null}
    </div>
  );
}
