"use client";

import { useMessages } from "@/lib/i18n/LocaleProvider";
import AdWaitBar from "./AdWaitBar";

export default function AdNavigationNotice() {
  const label = useMessages().plansModal.adLoading;
  return (
    <div id="ad-navigation-notice" hidden role="status"
      className="pointer-events-none fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[9999] mx-auto max-w-sm rounded-2xl border border-violet-400/40 bg-[var(--card)] p-4 text-center text-sm text-[var(--text)] shadow-xl">
      <p className="mb-2">{label}</p>
      <AdWaitBar label={label} />
    </div>
  );
}
