"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackEvent } from "@/lib/analytics";

/**
 * Fires a single `scroll_50` event the first time a visitor reaches half of the
 * page. GA4's built-in enhanced measurement only reports scrolls at 90%, which
 * almost nobody reaches on a long dictionary article, so readers who clearly
 * engaged were not being counted at all.
 */
export default function ScrollDepthTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let fired = false;
    let ticking = false;

    const check = () => {
      ticking = false;
      if (fired) return;

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const percent = (window.scrollY / scrollable) * 100;
      if (percent < 50) return;

      fired = true;
      window.removeEventListener("scroll", onScroll);
      trackEvent("scroll_50", { page_path: pathname });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(check);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Covers visitors who land mid-article through an anchor link.
    window.requestAnimationFrame(check);

    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
