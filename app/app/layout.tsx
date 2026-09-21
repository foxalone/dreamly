import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppHeader from "./AppHeader";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// The PayPal JS SDK is NOT loaded here on purpose. It used to be injected for
// every /app page with `intent=subscription&vault=true`, while
// app/app/upgrade/UpgradeClient.tsx loads it a second time through
// PayPalScriptProvider (same namespace `window.paypal`, different query
// string). Two SDK instances on one page replace each other's `window.paypal`
// and break the Buttons popup. The single source of truth for the SDK
// configuration is the provider on the upgrade page.
export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <AppHeader />
      <div>{children}</div>
    </div>
  );
}
