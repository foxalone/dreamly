"use client";

import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { dreamAnalysisProgressMessages } from "@/lib/i18n/dream-analysis-progress";

/** Indeterminate: the analysis API does not report a completion percentage. */
export default function DreamAnalysisProgress({ active }: { active: boolean }) {
  const locale = useLocale();
  if (!active || typeof document === "undefined") return null;
  const copy = dreamAnalysisProgressMessages[locale];
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
      <div role="status" aria-live="polite" className="w-full max-w-md rounded-3xl border border-purple-400/30 bg-[var(--card)] px-6 py-9 text-center shadow-2xl sm:px-10 sm:py-12" dir={locale === "ar" ? "rtl" : "ltr"}>
        <Sparkles className="mx-auto mb-5 h-10 w-10 text-purple-500" aria-hidden="true" />
        <h2 className="text-2xl font-semibold text-[var(--text)] sm:text-3xl">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">{copy.body}</p>
        <div role="progressbar" aria-label={copy.title} className="mt-7 h-3 overflow-hidden rounded-full bg-purple-500/15">
          <div className="dream-analysis-progress-bar h-full w-2/5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-400" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
