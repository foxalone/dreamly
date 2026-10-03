"use client";

import { Loader2, VenetianMask } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";
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
}: {
  status: AnonShareStatus;
  onShare: () => void;
  onSignIn: () => void;
}) {
  const t = useMessages();
  const first = shareBadgeFor(1);
  const after = nextShareBadge(1)?.badge ?? first;

  if (status === "done" || status === "already") {
    return (
      <div className="mt-4 rounded-2xl border border-purple-300/50 bg-purple-50/60 p-4 text-sm text-zinc-800 dark:bg-purple-500/10 dark:text-[var(--text)]">
        <p>
          {status === "done"
            ? formatMessage(t.shareBadges.guestDone, {
                badge: shareBadgeLabel(t, first),
                next: shareBadgeLabel(t, after),
              })
            : t.shareBadges.guestAlready}
        </p>
        <button
          type="button"
          onClick={onSignIn}
          className="mt-3 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
        >
          {t.shareBadges.signInCta}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-start">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {first.emoji}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text)]">{t.shareBadges.promptTitle}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {formatMessage(t.shareBadges.promptBody, { badge: shareBadgeLabel(t, first) })}
          </p>
        </div>
      </div>
      {status === "rejected" || status === "failed" ? (
        <p className="mt-3 text-xs text-red-500" role="alert">
          {status === "rejected" ? t.shareBadges.rejected : t.shareBadges.failed}
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
          {status === "busy" ? t.shareBadges.sharing : t.shareBadges.shareCta}
        </button>
      ) : null}
    </div>
  );
}
