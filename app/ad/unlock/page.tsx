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
 * Offerwall with a page inclusion for this path and metering threshold 1.
 */
export default function AdUnlockPage() {
  return (
    <Suspense fallback={null}>
      <AdUnlockClient />
    </Suspense>
  );
}
