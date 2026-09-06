import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata } from "@/lib/i18n/page-locale";
import { PrivacyBody, legalUpdatedLabel } from "@/lib/i18n/legal";

const t = getMessages("en");

export const metadata: Metadata = {
  title: `${t.legal.privacy} | Dreamly`,
  description:
    "How Dreamly collects, uses, and protects your information when you use our AI dream interpreter, journal, map, and related services.",
  ...localeMetadata("/privacy", "en"),
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell title={t.legal.privacy} updated={legalUpdatedLabel("en")} locale="en">
      <PrivacyBody locale="en" />
    </LegalShell>
  );
}
