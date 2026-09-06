import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata } from "@/lib/i18n/page-locale";
import { RefundBody, legalUpdatedLabel } from "@/lib/i18n/legal";

const t = getMessages("en");

export const metadata: Metadata = {
  title: `${t.legal.refund} | Dreamly`,
  description:
    "Dreamly refund policy for digital credit packs: at least 30 days money-back from the order date. Paddle.com is Merchant of Record for Paddle orders.",
  ...localeMetadata("/refund", "en"),
  robots: { index: true, follow: true },
};

export default function RefundPage() {
  return (
    <LegalShell title={t.legal.refund} updated={legalUpdatedLabel("en")} locale="en">
      <RefundBody locale="en" />
    </LegalShell>
  );
}
