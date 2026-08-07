"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getClientAnalytics, trackEvent } from "@/lib/analytics";

export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    void getClientAnalytics();

    return onAuthStateChanged(auth, (user) => {
      void getClientAnalytics().then(async (analytics) => {
        if (!analytics) return;
        const { setUserId, setUserProperties } = await import("firebase/analytics");
        setUserId(analytics, user?.uid ?? null);
        setUserProperties(analytics, {
          account_state: user ? "authenticated" : "guest",
        });
      });
    });
  }, []);

  useEffect(() => {
    if (!pathname) return;

    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    trackEvent("page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
