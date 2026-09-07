import { SUBSCRIPTION_PLANS } from "@/lib/subscriptions/plans";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
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

        <h2 className="mt-12 text-xl font-semibold tracking-tight">{t.pricing.plansTitle}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-lg font-semibold">{t.pricing.free}</p>
            <p className="mt-2 text-2xl font-semibold">{formatUsd("0")}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.billedFree}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.freeNote}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.accessFeatures}</p>
          </li>
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-lg font-semibold">{t.pricing.monthly}</p>
            <p className="mt-2 text-2xl font-semibold">{formatUsd(SUBSCRIPTION_PLANS.monthly.price)}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.billedMonthly}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.trialBadge}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.accessFeatures}</p>
          </li>
          <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-lg font-semibold">{t.pricing.yearly}</p>
            <p className="mt-2 text-2xl font-semibold">{formatUsd(SUBSCRIPTION_PLANS.yearly.price)}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.billedYearly}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.yearlySave}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.pricing.accessFeatures}</p>
          </li>
        </ul>

        <p className="mt-8 text-sm leading-6 text-[var(--muted)]">{t.pricing.limitsNote}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.pricing.useFor}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.pricing.cancelAnytime}</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          <LocaleLink href="/refund" className="underline underline-offset-2 hover:text-[var(--text)]">
            {t.pricing.refundNote}
          </LocaleLink>
        </p>
        <p className="mt-8">
          <LocaleLink href="/app/upgrade" className="dream-primary-btn inline-flex no-underline">
            {t.pricing.subscribeCta}
          </LocaleLink>
        </p>
      </main>

      <SiteLegalFooter locale={locale} />
    </div>
  );
}
