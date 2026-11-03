"use client";

import { useId, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { ANALYSIS_ATTEMPT_COPY } from "@/lib/i18n/analysisAttempts";
import { ADMIN_DREAM_TABS_COPY } from "@/lib/i18n/adminDreamTabs";
import AnalysisAttempts from "./AnalysisAttempts";
import AdminComments from "./AdminComments";

export default function DreamsTabs({ children, isAdmin }: { children: ReactNode; isAdmin: boolean }) {
  const locale = useLocale();
  const t = ADMIN_DREAM_TABS_COPY[locale];
  const id = useId();
  const [active, setActive] = useState(0);
  const [attemptsVisited, setAttemptsVisited] = useState(false);
  const [commentsVisited, setCommentsVisited] = useState(false);
  const labels = [t.dreams, ANALYSIS_ATTEMPT_COPY[locale].title, t.comments];

  function select(index: number) {
    setActive(index);
    if (index === 1) setAttemptsVisited(true);
    if (index === 2) setCommentsVisited(true);
  }

  return (
    <>
      <div role="tablist" aria-label={t.label} dir={locale === "ar" ? "rtl" : "ltr"} className="mt-6 flex flex-wrap gap-2">
        {labels.map((label, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? labels.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + labels.length) % labels.length;
              select(next);
              document.getElementById(`${id}-tab-${next}`)?.focus();
            }}
            className={`rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${active === index ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--text)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={active !== 0} tabIndex={0}>
        {children}
      </div>
      <div role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={active !== 1} tabIndex={0}>
        {attemptsVisited && isAdmin ? <AnalysisAttempts /> : null}
      </div>
      <div role="tabpanel" id={`${id}-panel-2`} aria-labelledby={`${id}-tab-2`} hidden={active !== 2} tabIndex={0}>
        {commentsVisited && isAdmin ? <AdminComments /> : null}
      </div>
    </>
  );
}
