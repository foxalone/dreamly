"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { reportAnalysisAttempt } from "@/lib/reportAnalysisAttempt";
import { trackEvent } from "@/lib/analytics";

/** Evidence of a visible answer, not proof that a person read or understood it. */
export default function AnalysisDisplay({ attemptId, children, yourfitPromo = false, audience = "guest" }: { attemptId?: string | null; children: ReactNode; yourfitPromo?: boolean; audience?: "guest" | "account" }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!attemptId || !element.current) return;
    let visible = false;
    let reported = false;
    let disposed = false;
    const report = () => {
      if (!visible || document.visibilityState !== "visible" || reported) return;
      reported = true;
      if (yourfitPromo) {
        let firstDisplay = true;
        try {
          const key = `dreamly:yourfit-analysis-display:${attemptId}`;
          firstDisplay = !localStorage.getItem(key);
          localStorage.setItem(key, "1");
        } catch { /* Display is still reported when storage is unavailable. */ }
        if (firstDisplay) trackEvent("yourfit_analysis_displayed", { campaign: "first_analysis_no_ad", placement: `${audience}_dream_result` });
      }
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
  }, [attemptId, yourfitPromo, audience]);
  return <div ref={element}>{children}</div>;
}
