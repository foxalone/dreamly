import AdWaitBar from "@/app/components/AdWaitBar";
import type { Metadata } from "next";
import { Suspense } from "react";

import AdUnlockClient from "./AdUnlockClient";

export const metadata: Metadata = {
  title: "Dreamly",
  robots: { index: false, follow: false },
};

/**
 * /ad/unlock?kind=analysis|save|translate&next=/path — the AdSense Offerwall
 * page (see lib/adUnlock.ts). Configured in AdSense › Privacy & messaging ›
 * Offerwall with a page inclusion for this path and "Show after 0 page views".
 */
export default function AdUnlockPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <AdWaitBar label="Dreamly" />
        </div>
      </main>
    }>
      <AdUnlockClient />
    </Suspense>
  );
}
