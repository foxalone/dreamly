import type { ReactNode } from "react";
import Script from "next/script";
import BottomNav from "./BottomNav";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* PayPal JS SDK */}
      {paypalClientId ? (
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${paypalClientId}&intent=capture`}
          strategy="afterInteractive"
        />
      ) : null}

      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}