"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { reportAnalysisAttempt } from "@/lib/reportAnalysisAttempt";

/** Evidence of a visible answer, not proof that a person read or understood it. */
export default function AnalysisDisplay({ attemptId, children }: { attemptId?: string | null; children: ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!attemptId || !element.current) return;
    let visible = false;
    let reported = false;
    let disposed = false;
    const report = () => {
      if (!visible || document.visibilityState !== "visible" || reported) return;
      reported = true;
      void (async () => {
        const token = await auth.currentUser?.getIdToken().catch(() => undefined);
        if (!disposed) reportAnalysisAttempt("analysis_displayed", undefined, attemptId, token);
      })().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      report();
    });
    observer.observe(element.current);
    document.addEventListener("visibilitychange", report);
    return () => { disposed = true; observer.disconnect(); document.removeEventListener("visibilitychange", report); };
  }, [attemptId]);
  return <div ref={element}>{children}</div>;
}
