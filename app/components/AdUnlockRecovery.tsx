"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AD_UNLOCK_PATH, adUnlockUrl } from "@/lib/adUnlock";
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
      if (session.status === "granted" && window.location.pathname + window.location.search === session.next) return;
      navigating = true;
      // A completed but unbooked ad reuses its receipt on /ad/unlock; it must
      // not show another ad or grant a second credit after an interrupted POST.
      window.location.replace(session.status === "granted" ? session.next : adUnlockUrl("analysis", session.next));
    };
    recover();
    window.addEventListener("pageshow", recover);
    window.addEventListener("focus", recover);
    return () => {
      window.removeEventListener("pageshow", recover);
      window.removeEventListener("focus", recover);
    };
  }, [pathname]);
  return null;
}
