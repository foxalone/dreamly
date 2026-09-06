import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import { getMessages } from "@/lib/i18n/messages";
import { localeMetadata } from "@/lib/i18n/page-locale";
import { TermsBody, legalUpdatedLabel } from "@/lib/i18n/legal";

const t = getMessages("en");

export const metadata: Metadata = {
  title: `${t.legal.terms} | Dreamly`,
  description: "Terms governing your use of Dreamly — AI dream interpretation, journal, dictionary, map, and related services.",
  ...localeMetadata("/terms", "en"),
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell title={t.legal.terms} updated={legalUpdatedLabel("en")} locale="en">
      <TermsBody locale="en" />
    </LegalShell>
  );
}
