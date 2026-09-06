import { CREDIT_PACKS } from "@/lib/credits/packs";
import type { Locale } from "@/lib/i18n/config";
import { formatMessage, getMessages } from "@/lib/i18n/messages";
import LocaleLink from "@/lib/i18n/LocaleLink";
import LanguageSwitcher from "@/lib/i18n/LanguageSwitcher";
import SiteLegalFooter from "@/app/components/SiteLegalFooter";

function formatUsd(price: string) {
  const value = Number(price);
  if (!Number.isFinite(value)) return `$${price}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function PricingView({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const packs = Object.values(CREDIT_PACKS);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="flex justify-end px-6 pt-4">
        <LanguageSwitcher />
      </div>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t.legal.pricing}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{t.pricing.h1}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">{t.pricing.lead}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.pricing.freeNote}</p>

        <h2 className="mt-12 text-xl font-semibold tracking-tight">{t.pricing.packsTitle}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {packs.map((pack) => (
            <li key={pack.credits} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-lg font-semibold">{formatMessage(t.pricing.credits, { n: pack.credits })}</p>
              <p className="mt-2 text-2xl font-semibold">{formatUsd(pack.price)}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.oneTime}</p>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-6 text-[var(--muted)]">{t.pricing.useFor}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          <LocaleLink href="/refund" className="underline underline-offset-2 hover:text-[var(--text)]">
            {t.pricing.refundNote}
          </LocaleLink>
        </p>
      </main>

      <SiteLegalFooter locale={locale} />
    </div>
  );
}
