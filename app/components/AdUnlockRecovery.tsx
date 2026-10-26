"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AD_UNLOCK_PATH, adUnlockUrl, markAdUnlockReady } from "@/lib/adUnlock";
import { recoverOfferwallSession } from "@/lib/offerwallSession";

/** Recover a completed guest ad even when Safari returns to its cached source page. */
export default function AdUnlockRecovery() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === AD_UNLOCK_PATH) return;
    let navigating = false;
    const recover = () => {
      if (navigating) return;
      const session = recoverOfferwallSession(document.cookie);
      if (!session || session.status === "watching") return;
      if (session.status === "granted") {
        markAdUnlockReady();
        if (window.location.pathname + window.location.search === session.next) return;
      }
      navigating = true;
      // A completed but unbooked ad reuses its receipt on /ad/unlock; it must
      // not show another ad or grant a second credit after an interrupted POST.
      window.location.replace(session.status === "granted" ? session.next : adUnlockUrl("analysis", session.next));
    };
    recover();
    window.addEventListener("pageshow", recover);
    window.addEventListener("focus", recover);
    document.addEventListener("visibilitychange", recover);
    // Google may write its entitlement after pageshow/focus. Keep watching
    // until the pending action expires instead of losing a completed ad.
    const poll = window.setInterval(recover, 1000);
    return () => {
      window.removeEventListener("pageshow", recover);
      window.removeEventListener("focus", recover);
      document.removeEventListener("visibilitychange", recover);
      window.clearInterval(poll);
    };
  }, [pathname]);
  return null;
}
