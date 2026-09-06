import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import { getMessages } from "@/lib/i18n/messages";
import { localeFromParams, localeMetadata } from "@/lib/i18n/page-locale";
import { PrivacyBody, legalUpdatedLabel } from "@/lib/i18n/legal";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFromParams(params);
  const t = getMessages(locale);
  return {
    title: `${t.legal.privacy} | Dreamly`,
    description: t.home.lead,
    ...localeMetadata("/privacy", locale),
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }: Props) {
  const locale = await localeFromParams(params);
  const t = getMessages(locale);
  return (
    <LegalShell title={t.legal.privacy} updated={legalUpdatedLabel(locale)} locale={locale}>
      <PrivacyBody locale={locale} />
    </LegalShell>
  );
}
