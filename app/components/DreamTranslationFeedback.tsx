"use client";

import { useEffect, useId, useRef } from "react";
import { CircleAlert } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { dreamTranslationFeedbackCopy } from "@/lib/i18n/dream-translation-feedback";
import DreamAnalysisProgress from "./DreamAnalysisProgress";

export default function DreamTranslationFeedback({ active, error, onClose }: {
  active: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useMessages();
  const copy = dreamTranslationFeedbackCopy[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (error && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [error]);

  return (
    <>
      <DreamAnalysisProgress active={active && !error} title={t.profile.translating} body={null} />
      {error && (
        <dialog
          ref={dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          dir={locale === "ar" ? "rtl" : "ltr"}
          onClose={onClose}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-purple-400/30 bg-[var(--card)] p-6 text-center text-[var(--text)] shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm sm:p-8"
        >
          <CircleAlert className="mx-auto mb-4 size-9 text-purple-500" aria-hidden="true" />
          <h2 id={titleId} className="text-xl font-semibold">{copy.title}</h2>
          <p id={messageId} className="mt-2 text-sm leading-6 text-[var(--muted)]">{error}</p>
          <button type="button" className="dream-btn mt-6" onClick={() => dialog.current?.close()}>{copy.close}</button>
        </dialog>
      )}
    </>
  );
}
